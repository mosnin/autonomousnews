"""End-to-end news pipeline: scout → edit → write → publish.

Designed so the same code runs locally (`python -m technotimes_agents.pipeline`)
and on Modal.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import re
import time
import uuid
from typing import Any

import httpx
from openai import AsyncOpenAI

from .api_client import ApiClient, LogBuffer
from .config import Config
from .sources import (
    Trend,
    dedupe_trends,
    fetch_newsapi_top_headlines,
    fetch_thenewsapi_top,
)
from .taxonomy import (
    CATEGORIES,
    Author,
    find_category,
    select_author,
)


# --- pricing (rough $/1M tokens — used for the cost ledger; not billing) ----
MODEL_PRICING_USD_PER_M = {
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-4o": {"input": 5.0, "output": 15.0},
    "gpt-4.1-mini": {"input": 0.4, "output": 1.6},
    "gpt-4.1": {"input": 2.0, "output": 8.0},
    "gpt-5-mini": {"input": 0.25, "output": 2.0},
    "gpt-5": {"input": 1.25, "output": 10.0},
}
DALLE_USD_PER_IMAGE = 0.040  # 1024x1024 standard quality


def slugify(text: str, max_len: int = 60) -> str:
    """Aggressively short, focus-keyword-friendly slugs.

    Trims at the LAST word boundary inside max_len so we never produce a
    `...-w` truncation. Falls back to 'story' if everything is filtered out.
    """
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    if not text:
        return "story"
    if len(text) <= max_len:
        return text
    # Trim at the last hyphen that fits inside max_len.
    cut = text[:max_len].rsplit("-", 1)[0]
    return cut or text[:max_len]


def topic_key(title: str, category_slug: str) -> str:
    h = hashlib.sha1(f"{category_slug}:{title.lower()}".encode()).hexdigest()
    return f"{category_slug}-{h[:12]}"


def estimate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    p = MODEL_PRICING_USD_PER_M.get(model, {"input": 1.0, "output": 3.0})
    return (prompt_tokens * p["input"] + completion_tokens * p["output"]) / 1_000_000


# --- agent prompts ---------------------------------------------------------
EDITOR_SYSTEM = """You are the editor of Techno Times, a global English-language general-news site.

You receive a list of trending headlines from news APIs. Your job is to pick the
N most newsworthy, story-worthy items and assign each to a category and
subcategory from a fixed taxonomy. Avoid duplicates, sports scores without
context, and headlines that are pure clickbait. Prefer stories of global
significance.

You MUST respond as valid JSON matching the schema the user supplies.
"""

POWER_WORDS = [
    "Inside", "Why", "How", "Quietly", "Suddenly", "Just", "Now", "First",
    "Last", "New", "Breaking", "Major", "Latest", "Rare", "Defining",
    "Pivotal", "Critical", "Crucial", "Decisive", "Sweeping", "Stunning",
    "Sharp", "Bold", "Hidden", "Unfolding", "Surprising", "Strategic",
    "Urgent", "Quiet", "Final", "Renewed",
]


WRITER_SYSTEM = """You are {author_name}, {author_title} at Techno Times.

Write neutral, informative news articles in the house style of a major
international newspaper (think The New York Times). Always:

EDITORIAL VOICE
- Lead with the most important fact in the first paragraph.
- Attribute every claim to a source. If a fact comes from a wire report, say so.
- Avoid opinion. Avoid speculation. Avoid clickbait.
- NEVER give medical, legal or financial advice. NEVER advocate for one
  political party over another. Cover policy substance, not partisan framing.
- Target 1,000–1,500 words. Use short paragraphs. End with a short outlook
  paragraph that summarizes where the story may go next.

FORMATTING
- Format H2 subheadings with '## ' on their own line.
- Include 1–2 pull quotes by prefixing a memorable, self-contained sentence
  (12–25 words) with '>> ' on its own line.
- Include 2–3 outbound links to credible sources written as inline markdown
  links: [link text](https://full.url). The link text should be substantive
  (the source publication name or a specific phrase), never 'click here'.

SEO REQUIREMENTS — every article MUST satisfy ALL of these
- focus_keyword: ONE high-intent search phrase, 2–5 words, that this article
  is meant to rank for. Lowercase, no punctuation.
- long_tail_keywords: 4–5 additional high-intent long-tail phrases (3–6
  words each). These are search queries a real reader might type. Include
  question forms when natural ('how does X affect Y', 'what is X').
- power_word: pick EXACTLY ONE from this list and use it in the title:
  {power_words}
- title: < 100 chars, MUST contain BOTH the power_word AND the focus_keyword
  verbatim (case-insensitive). Read as a newspaper headline, not a listicle.
- slug: kebab-case of the focus_keyword ONLY, no extra words, max 60 chars.
  Example: focus_keyword 'ai chip export rules' -> slug 'ai-chip-export-rules'.
- seo_title: < 70 chars, MUST contain the focus_keyword. May add a
  '— Techno Times'-style site suffix.
- seo_description: < 160 chars, MUST contain the focus_keyword in the first
  half, sells the click without being sensational.
- Keyword density: across the entire body, mentions of focus_keyword +
  long_tail_keywords (and their natural variants) should account for 2–3% of
  total words. For a 1,200-word article that is ~24–36 mentions combined.
  Distribute them naturally — never stuff.
- Image alt text: cover_image_alt MUST contain the focus_keyword.
- FAQ: produce 3–5 question/answer pairs. Questions are real queries readers
  would type ('Is X legal?', 'When does X take effect?'). Answers are 2–4
  factual sentences, no editorializing.

You MUST respond as valid JSON matching the schema the user supplies.
"""

WRITER_UPDATE_SYSTEM = WRITER_SYSTEM + """

THIS IS AN UPDATE TO AN EXISTING ARTICLE on the same topic. You will be given
the existing article body. Produce a fully rewritten article that:

- Preserves the story's existing structure where the underlying facts have not
  changed.
- Folds the NEW information from the latest source into the lede and the body.
- Does NOT contradict facts in the existing article unless the new source
  explicitly overturns them — in which case flag the change.
- Keeps roughly the same word count.
- Returns the SAME JSON schema as a fresh article (title, dek, body, etc.).
  Title and headline may be sharpened to reflect the new information.
"""


def category_menu_text() -> str:
    lines = []
    for c in CATEGORIES:
        subs = ", ".join(s.slug for s in c.subcategories)
        lines.append(f"- {c.slug}: {c.name} (subs: {subs})")
    return "\n".join(lines)


# --- pipeline --------------------------------------------------------------
async def fetch_trends(cfg: Config, log: LogBuffer) -> list[Trend]:
    trends: list[Trend] = []
    if cfg.newsapi_key:
        try:
            t = await fetch_newsapi_top_headlines(cfg.newsapi_key)
            await log.info("fetched newsapi", count=len(t))
            trends.extend(t)
        except Exception as e:
            await log.warn("newsapi fetch failed", error=str(e))
    if cfg.thenewsapi_token:
        try:
            t = await fetch_thenewsapi_top(cfg.thenewsapi_token)
            await log.info("fetched thenewsapi", count=len(t))
            trends.extend(t)
        except Exception as e:
            await log.warn("thenewsapi fetch failed", error=str(e))

    deduped = dedupe_trends(trends)
    await log.info("trends deduped", before=len(trends), after=len(deduped))
    return deduped


async def select_topics(
    cfg: Config,
    client: AsyncOpenAI,
    trends: list[Trend],
    n: int,
    recent_topics: list[dict[str, Any]],
    log: LogBuffer,
) -> tuple[list[dict[str, Any]], float, int, int]:
    """Ask the editor agent for N topics with category routing."""
    headlines = [
        {
            "id": i,
            "title": t.title,
            "description": (t.description or "")[:300],
            "url": t.url,
            "source": t.source,
            "image_url": t.image_url,
        }
        for i, t in enumerate(trends[:80])
    ]
    # Truncate the recent-topic context so the editor can reason about
    # continuations without blowing the context window.
    recent_compact = [
        {
            "topic_key": t.get("topic_key"),
            "title": t.get("title"),
            "category": t.get("category_slug"),
        }
        for t in recent_topics[:80]
    ]

    user_msg = f"""Pick the {n} most newsworthy items to publish next.

Trending headlines (id + title + 1-line desc):
{json.dumps(headlines, indent=2)}

Recently-published topics on this site (the same story may be re-trending):
{json.dumps(recent_compact, indent=2)}

Available categories and subcategories:
{category_menu_text()}

If a trending headline is clearly a continuation of one of our recent topics,
set `existing_topic_key` to that exact topic_key so we update the existing
article in place instead of publishing a duplicate. Otherwise set it to null.

Respond with JSON:
{{
  "selections": [
    {{
      "headline_id": <int>,
      "category_slug": "<exact slug from list>",
      "subcategory_slug": "<exact slug from list or null>",
      "angle": "<one-sentence angle for the article>",
      "is_breaking": <bool>,
      "is_featured": <bool>,
      "existing_topic_key": <string or null>
    }}
  ]
}}
"""
    resp = await client.chat.completions.create(
        model=cfg.editor_model,
        messages=[
            {"role": "system", "content": EDITOR_SYSTEM},
            {"role": "user", "content": user_msg},
        ],
        response_format={"type": "json_object"},
        temperature=0.4,
    )
    usage = resp.usage
    pt = usage.prompt_tokens if usage else 0
    ct = usage.completion_tokens if usage else 0
    cost = estimate_cost(cfg.editor_model, pt, ct)
    raw = resp.choices[0].message.content or "{}"
    try:
        selections = json.loads(raw).get("selections", [])
    except json.JSONDecodeError:
        await log.error("editor returned invalid json", raw=raw[:500])
        selections = []

    # attach trend objects
    out: list[dict[str, Any]] = []
    for s in selections:
        hid = s.get("headline_id")
        if hid is None or hid < 0 or hid >= len(trends):
            continue
        cat = s.get("category_slug")
        sub = s.get("subcategory_slug")
        if not find_category(cat or ""):
            continue
        out.append({
            "trend": trends[hid],
            "category_slug": cat,
            "subcategory_slug": sub,
            "angle": s.get("angle", ""),
            "is_breaking": bool(s.get("is_breaking", False)),
            "is_featured": bool(s.get("is_featured", False)),
            "existing_topic_key": s.get("existing_topic_key") or None,
        })

    await log.info("editor selected topics", count=len(out), cost_usd=round(cost, 4))
    return out, cost, pt, ct


async def write_article(
    cfg: Config,
    client: AsyncOpenAI,
    selection: dict[str, Any],
    log: LogBuffer,
    existing: dict[str, Any] | None = None,
) -> tuple[dict[str, Any] | None, float, int, int]:
    trend: Trend = selection["trend"]
    author: Author = select_author(
        selection["category_slug"], selection["subcategory_slug"]
    )

    if existing:
        # Living-article update path — anchor the author to whoever already
        # owns this story so bylines stay stable.
        author = next(
            (a for a in (author,) if a.slug == existing.get("author_slug")),
            author,
        )
        existing_body = (existing.get("body") or "")[:6000]
        user_msg = f"""Update this existing article with newly reported information.

EXISTING ARTICLE (title): {existing.get('title')}
EXISTING ARTICLE (body, truncated):
---
{existing_body}
---

NEW SOURCE
Topic: {trend.title}
Angle: {selection['angle']}
Source description: {trend.description or '(none)'}
Source URL: {trend.url or '(none)'}
Source publication: {trend.source}
Category: {selection['category_slug']} / {selection['subcategory_slug'] or '(none)'}

Respond with JSON (same schema as a fresh article):
{{
  "focus_keyword": "<2-5 word phrase>",
  "long_tail_keywords": ["<4-5 long-tail queries>"],
  "power_word": "<one from the curated list>",
  "title": "<< 100 chars, includes power_word + focus_keyword>",
  "slug": "<kebab-case of focus_keyword, <= 60 chars>",
  "dek": "<one-sentence subheadline, < 200 chars>",
  "excerpt": "<3-sentence summary>",
  "body": "<the fully rewritten article incorporating the new information>",
  "cover_image_alt": "<descriptive alt text containing focus_keyword>",
  "seo_title": "<< 70 chars, must contain focus_keyword>",
  "seo_description": "<< 160 chars, must contain focus_keyword in first half>",
  "seo_keywords": ["<5-10 keywords>"],
  "tags": ["<topical tags>"],
  "read_minutes": <int>,
  "faq": [
    {{ "q": "<question>", "a": "<2-4 sentence answer>" }}
  ]
}}
"""
        system_msg = WRITER_UPDATE_SYSTEM.format(
            author_name=author.name, author_title=author.title,
            power_words=", ".join(POWER_WORDS),
        )
    else:
        user_msg = f"""Write a 1,000–1,500 word news article.

Topic: {trend.title}
Angle: {selection['angle']}
Source description: {trend.description or '(none)'}
Source URL: {trend.url or '(none)'}
Source publication: {trend.source}
Category: {selection['category_slug']} / {selection['subcategory_slug'] or '(none)'}

Respond with JSON:
{{
  "focus_keyword": "<2-5 word phrase the article is meant to rank for>",
  "long_tail_keywords": ["<4-5 long-tail queries>"],
  "power_word": "<exactly one from the curated list>",
  "title": "<< 100 chars, MUST contain power_word + focus_keyword>",
  "slug": "<kebab-case of focus_keyword, <= 60 chars, no extra words>",
  "dek": "<one-sentence subheadline, < 200 chars>",
  "excerpt": "<3-sentence summary used for cards and SEO description>",
  "body": "<the article as plain paragraphs separated by blank lines. H2 lines start with '## '. Include 1-2 '>> ' pull quotes. Include 2-3 inline markdown links to outbound credible sources. Focus + long-tail keywords mentioned naturally throughout for 2-3% density.>",
  "cover_image_alt": "<descriptive alt text containing focus_keyword>",
  "seo_title": "<title tuned for search, < 70 chars, contains focus_keyword>",
  "seo_description": "<meta description, < 160 chars, focus_keyword in first half>",
  "seo_keywords": ["<5-10 keywords>"],
  "tags": ["<topical tags>"],
  "read_minutes": <int estimate>,
  "faq": [
    {{ "q": "<question a real reader would search>", "a": "<2-4 sentence factual answer>" }}
  ]
}}
"""
        system_msg = WRITER_SYSTEM.format(
            author_name=author.name, author_title=author.title,
            power_words=", ".join(POWER_WORDS),
        )

    resp = await client.chat.completions.create(
        model=cfg.writer_model,
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_msg},
        ],
        response_format={"type": "json_object"},
        temperature=0.7,
    )
    usage = resp.usage
    pt = usage.prompt_tokens if usage else 0
    ct = usage.completion_tokens if usage else 0
    cost = estimate_cost(cfg.writer_model, pt, ct)

    try:
        data = json.loads(resp.choices[0].message.content or "{}")
    except json.JSONDecodeError:
        await log.error("writer returned invalid json", title=trend.title)
        return None, cost, pt, ct

    if not data.get("title") or not data.get("body"):
        await log.warn("writer skipped empty article", title=trend.title)
        return None, cost, pt, ct

    # Slug priority: writer's slug (built from focus_keyword) > slugified title.
    focus_kw = (data.get("focus_keyword") or "").strip()
    raw_slug = (data.get("slug") or "").strip().lower()
    if raw_slug:
        slug = slugify(raw_slug)
    elif focus_kw:
        slug = slugify(focus_kw)
    else:
        slug = slugify(data["title"])

    # Alt text MUST contain the focus_keyword. Fall back to constructing one
    # so we never ship empty alt.
    alt_text = (data.get("cover_image_alt") or "").strip()
    if focus_kw and focus_kw.lower() not in alt_text.lower():
        alt_text = (
            f"{focus_kw}: {alt_text}".strip(": ").strip()
            if alt_text
            else f"{focus_kw} — illustration for Techno Times"
        )

    article = {
        "slug": slug,
        "title": data["title"],
        "dek": data.get("dek"),
        "body": data["body"],
        "excerpt": data.get("excerpt"),
        "category_slug": selection["category_slug"],
        "subcategory_slug": selection["subcategory_slug"],
        "tags": data.get("tags", []),
        "author_name": author.name,
        "author_slug": author.slug,
        "source_urls": [trend.url] if trend.url else [],
        "status": "published",
        "read_minutes": int(data.get("read_minutes", 6)),
        "is_featured": selection["is_featured"],
        "is_breaking": selection["is_breaking"],
        "seo_title": data.get("seo_title"),
        "seo_description": data.get("seo_description"),
        "seo_keywords": data.get("seo_keywords", []),
        # source image (we hot-link with credit; agent does NOT re-host)
        "cover_image_url": trend.image_url,
        "cover_image_alt": alt_text,
        "image_credit": f"Photo: {trend.source}" if trend.image_url else None,
        "image_source_url": trend.url if trend.image_url else None,
        "image_is_ai_generated": False,
        "image_provider": trend.provider if trend.image_url else None,
        # living-article identifiers
        "topic_key": topic_key(data["title"], selection["category_slug"]),
        "model_used": cfg.writer_model,
        "prompt_tokens": pt,
        "completion_tokens": ct,
        "generation_cost_usd": round(cost, 4),
        "ai_disclosed": True,
        # SEO metadata (phase 5)
        "focus_keyword": focus_kw or None,
        "long_tail_keywords": data.get("long_tail_keywords", []),
        "power_word": data.get("power_word"),
        "faq": data.get("faq") or None,
    }
    return article, cost, pt, ct


async def generate_fallback_image(
    cfg: Config, client: AsyncOpenAI, title: str, log: LogBuffer
) -> tuple[str | None, float]:
    """DALL·E 3 fallback when no source image is available."""
    prompt = (
        f"Editorial illustration for the news article: '{title}'. "
        "Hyper-realistic, modern, classy aesthetic; cinematic lighting; "
        "subtle desaturated color palette; no text, no logos, no watermarks."
    )
    try:
        resp = await client.images.generate(
            model=cfg.image_model,
            prompt=prompt,
            size="1792x1024",
            quality="standard",
            n=1,
        )
        url = resp.data[0].url if resp.data else None
        return url, DALLE_USD_PER_IMAGE
    except Exception as e:
        await log.warn("image generation failed", error=str(e))
        return None, 0.0


async def run_pipeline(cfg: Config, trigger: str = "cron") -> dict[str, Any]:
    api = ApiClient(cfg.site_url, cfg.admin_api_key)
    log = LogBuffer(api, run_id=None)

    run_id = str(uuid.uuid4())
    started_at = time.time()
    started_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(started_at))

    await api.upsert_run({
        "id": run_id,
        "trigger": trigger,
        "agent": "news-scout",
        "status": "running",
        "started_at": started_iso,
        "model": cfg.writer_model,
    })
    log.set_run_id(run_id)
    await log.info("pipeline started", trigger=trigger)

    total_cost = 0.0
    image_cost = 0.0
    articles_created = 0
    articles_updated = 0
    topics_considered = 0
    err: str | None = None
    cancelled = False

    try:
        # ---- Budget gate ----------------------------------------------------
        try:
            budget = await api.get_budget()
            await log.info(
                "budget check",
                spent_usd=budget.get("spent_usd"),
                cap_usd=budget.get("cap_usd"),
                remaining_usd=budget.get("remaining_usd"),
            )
            if budget.get("over_budget"):
                await log.warn(
                    "over daily budget — cancelling run",
                    spent_usd=budget.get("spent_usd"),
                    cap_usd=budget.get("cap_usd"),
                )
                cancelled = True
        except Exception as e:
            # Don't fail-open silently; warn but keep going so a misconfigured
            # /api/agent/budget never strands the pipeline.
            await log.warn("budget check failed; proceeding", error=str(e))
            budget = {"remaining_usd": float("inf")}

        if not cancelled:
            trends = await fetch_trends(cfg, log)
            topics_considered = len(trends)
            if not trends:
                raise RuntimeError("no trends available from any source")

            n = max(cfg.articles_per_run_min, min(cfg.articles_per_run_max, 5))

            client = AsyncOpenAI(api_key=cfg.openai_api_key)
            recent = await api.recent_topics(days=7)
            await log.info("loaded recent topic context", count=len(recent))

            selections, editor_cost, _, _ = await select_topics(
                cfg, client, trends, n, recent, log
            )
            total_cost += editor_cost

            if cfg.dry_run:
                await log.info(
                    "dry-run: skipping writer + image + publish",
                    selections=[
                        {
                            "title": s["trend"].title,
                            "category": s["category_slug"],
                            "subcategory": s["subcategory_slug"],
                            "is_breaking": s["is_breaking"],
                            "existing_topic_key": s.get("existing_topic_key"),
                        }
                        for s in selections
                    ],
                )
                # Mark the run as a successful dry-run with no articles.
                selections = []

            for sel in selections:
                # Mid-run safety: if we've already spent the remaining budget,
                # stop before doing more writer or image calls.
                spent_so_far = total_cost + image_cost
                remaining = float(budget.get("remaining_usd") or 0.0)
                if remaining != float("inf") and spent_so_far >= remaining:
                    await log.warn(
                        "mid-run budget hit — stopping",
                        spent_run_usd=round(spent_so_far, 4),
                        remaining_at_start_usd=remaining,
                    )
                    break

                existing = None
                if sel.get("existing_topic_key"):
                    try:
                        existing = await api.find_article_by_topic_key(
                            sel["existing_topic_key"]
                        )
                    except Exception as e:
                        await log.warn(
                            "topic_key lookup failed; treating as new",
                            topic_key=sel["existing_topic_key"],
                            error=str(e),
                        )

                article, w_cost, _, _ = await write_article(
                    cfg, client, sel, log, existing=existing
                )
                total_cost += w_cost
                if article is None:
                    continue

                # If we matched an existing article, hand the route the
                # existing topic_key so it upserts in place.
                if existing:
                    article["topic_key"] = sel["existing_topic_key"]

                # Fallback DALL·E image when source had none AND it's a fresh
                # article (don't regenerate images on living updates).
                if not article["cover_image_url"] and not existing:
                    img_url, ic = await generate_fallback_image(
                        cfg, client, article["title"], log
                    )
                    image_cost += ic
                    if img_url:
                        article["cover_image_url"] = img_url
                        article["image_credit"] = "Illustration by Techno Times"
                        article["image_provider"] = cfg.image_model
                        article["image_is_ai_generated"] = True

                # Persist the cover image to Supabase Storage. DALL·E URLs
                # expire ~1 hour after generation and news-API thumbnails
                # rotate, so we re-host every image we plan to display. The
                # original URL is kept in image_source_url for credit /
                # provenance.
                if article["cover_image_url"]:
                    persisted = await api.persist_image(
                        article["cover_image_url"],
                        slug=article.get("slug"),
                    )
                    if persisted:
                        if not article.get("image_source_url"):
                            article["image_source_url"] = article["cover_image_url"]
                        article["cover_image_url"] = persisted
                        await log.info(
                            "image persisted",
                            provider=article.get("image_provider"),
                        )
                    else:
                        # Drop the cover rather than ship a URL we expect to
                        # 404. Hot story without an image > broken image.
                        await log.warn(
                            "image persist failed; dropping cover",
                            title=article["title"],
                            source_url=article["cover_image_url"],
                        )
                        article["cover_image_url"] = None
                        article["image_credit"] = None
                        article["image_provider"] = None
                        article["image_is_ai_generated"] = False

                article["run_id"] = run_id
                try:
                    result = await api.upsert_article(article)
                    if result.get("updated"):
                        articles_updated += 1
                        await log.info(
                            "article updated",
                            id=result.get("id"),
                            title=article["title"],
                        )
                    else:
                        articles_created += 1
                        await log.info(
                            "article published",
                            id=result.get("id"),
                            title=article["title"],
                        )
                except httpx.HTTPStatusError as e:
                    await log.warn(
                        "article upsert failed",
                        title=article["title"],
                        status=e.response.status_code,
                        body=e.response.text[:300],
                    )
                except Exception as e:
                    await log.warn(
                        "article upsert failed", title=article["title"], error=str(e)
                    )

    except Exception as e:  # pragma: no cover
        err = f"{type(e).__name__}: {e}"
        await log.error("pipeline failed", error=err)

    finished_at = time.time()
    finished_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(finished_at))
    duration_ms = int((finished_at - started_at) * 1000)

    # Final status: cancelled (budget), failed (exception), or succeeded.
    if cancelled:
        final_status = "cancelled"
    elif err:
        final_status = "failed"
    else:
        final_status = "succeeded"

    await api.upsert_run({
        "id": run_id,
        "trigger": trigger,
        "agent": "news-scout",
        "status": final_status,
        "started_at": started_iso,
        "finished_at": finished_iso,
        "duration_ms": duration_ms,
        "topics_considered": topics_considered,
        "articles_created": articles_created + articles_updated,
        "cost_usd": round(total_cost + image_cost, 4),
        "model": cfg.writer_model,
        "error": err,
        "metadata": {
            "openai_cost_usd": round(total_cost, 4),
            "image_cost_usd": round(image_cost, 4),
            "articles_new": articles_created,
            "articles_updated": articles_updated,
            "cancelled_reason": "over_daily_budget" if cancelled else None,
        },
    })

    # Roll cost into today's ledger for the budget banner.
    if total_cost > 0 or image_cost > 0 or articles_created or articles_updated:
        try:
            await api.report_cost(
                openai_cost_usd=round(total_cost, 4),
                image_cost_usd=round(image_cost, 4),
                articles=articles_created + articles_updated,
                runs=1,
            )
        except Exception as e:
            await log.warn("cost report failed", error=str(e))

    await log.flush()
    await api.aclose()
    return {
        "run_id": run_id,
        "articles_created": articles_created,
        "articles_updated": articles_updated,
        "status": final_status,
        "cost_usd": round(total_cost + image_cost, 4),
        "error": err,
    }


def main() -> None:
    cfg = Config.from_env()
    result = asyncio.run(run_pipeline(cfg, trigger="manual"))
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
