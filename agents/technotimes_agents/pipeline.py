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
}
DALLE_USD_PER_IMAGE = 0.040  # 1024x1024 standard quality


def slugify(text: str, max_len: int = 80) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text[:max_len] or "story"


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

WRITER_SYSTEM = """You are a {author_name}, {author_title} at Techno Times.

Write neutral, informative news articles in the house style of a major
international newspaper (think The New York Times). Always:

- Lead with the most important fact in the first paragraph.
- Attribute every claim to a source. If a fact comes from a wire report, say so.
- Avoid opinion. Avoid speculation. Avoid clickbait.
- NEVER give medical, legal or financial advice. NEVER advocate for one
  political party over another. Cover policy substance, not partisan framing.
- Target 1,000–1,500 words. Use short paragraphs. Use H2 subheadings sparingly
  to organize long pieces.
- End with a short outlook paragraph that summarizes where the story may go
  next.

You MUST respond as valid JSON matching the schema the user supplies.
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

    user_msg = f"""Pick the {n} most newsworthy items to publish next.

Trending headlines (id + title + 1-line desc):
{json.dumps(headlines, indent=2)}

Available categories and subcategories:
{category_menu_text()}

Respond with JSON:
{{
  "selections": [
    {{
      "headline_id": <int>,
      "category_slug": "<exact slug from list>",
      "subcategory_slug": "<exact slug from list or null>",
      "angle": "<one-sentence angle for the article>",
      "is_breaking": <bool>,
      "is_featured": <bool>
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
        })

    await log.info("editor selected topics", count=len(out), cost_usd=round(cost, 4))
    return out, cost, pt, ct


async def write_article(
    cfg: Config,
    client: AsyncOpenAI,
    selection: dict[str, Any],
    log: LogBuffer,
) -> tuple[dict[str, Any] | None, float, int, int]:
    trend: Trend = selection["trend"]
    author: Author = select_author(
        selection["category_slug"], selection["subcategory_slug"]
    )

    user_msg = f"""Write a 1,000–1,500 word news article.

Topic: {trend.title}
Angle: {selection['angle']}
Source description: {trend.description or '(none)'}
Source URL: {trend.url or '(none)'}
Source publication: {trend.source}
Category: {selection['category_slug']} / {selection['subcategory_slug'] or '(none)'}

Respond with JSON:
{{
  "title": "<rewritten headline, < 100 chars>",
  "dek": "<one-sentence subheadline, < 200 chars>",
  "excerpt": "<3-sentence summary used for cards and SEO description>",
  "body": "<the full article as plain paragraphs separated by blank lines. May include H2 lines starting with '## '.>",
  "seo_title": "<title tuned for search, < 70 chars>",
  "seo_description": "<meta description, < 160 chars>",
  "seo_keywords": ["<5-10 keywords>"],
  "tags": ["<topical tags>"],
  "read_minutes": <int estimate>
}}
"""
    resp = await client.chat.completions.create(
        model=cfg.writer_model,
        messages=[
            {"role": "system", "content": WRITER_SYSTEM.format(
                author_name=author.name, author_title=author.title
            )},
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

    slug = slugify(data["title"])
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
        "cover_image_alt": data.get("dek") or data["title"],
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
    topics_considered = 0
    err: str | None = None

    try:
        trends = await fetch_trends(cfg, log)
        topics_considered = len(trends)
        if not trends:
            raise RuntimeError("no trends available from any source")

        # Decide how many articles this run, within configured bounds.
        n = max(cfg.articles_per_run_min, min(cfg.articles_per_run_max, 5))

        client = AsyncOpenAI(api_key=cfg.openai_api_key)
        selections, editor_cost, _, _ = await select_topics(cfg, client, trends, n, log)
        total_cost += editor_cost

        for sel in selections:
            article, w_cost, _, _ = await write_article(cfg, client, sel, log)
            total_cost += w_cost
            if article is None:
                continue

            # Fallback DALL·E image when source had none.
            if not article["cover_image_url"]:
                img_url, ic = await generate_fallback_image(
                    cfg, client, article["title"], log
                )
                image_cost += ic
                if img_url:
                    article["cover_image_url"] = img_url
                    article["image_credit"] = "Illustration by Techno Times"
                    article["image_provider"] = cfg.image_model
                    article["image_is_ai_generated"] = True

            article["run_id"] = run_id
            try:
                aid = await api.insert_article(article)
                articles_created += 1
                await log.info("article published", id=aid, title=article["title"])
            except httpx.HTTPStatusError as e:  # noqa: F821 — imported via api_client side
                await log.warn(
                    "article insert failed",
                    title=article["title"],
                    status=e.response.status_code,
                    body=e.response.text[:300],
                )
            except Exception as e:
                await log.warn("article insert failed", title=article["title"], error=str(e))

    except Exception as e:  # pragma: no cover
        err = f"{type(e).__name__}: {e}"
        await log.error("pipeline failed", error=err)

    finished_at = time.time()
    finished_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(finished_at))
    duration_ms = int((finished_at - started_at) * 1000)

    await api.upsert_run({
        "id": run_id,
        "trigger": trigger,
        "agent": "news-scout",
        "status": "failed" if err else "succeeded",
        "started_at": started_iso,
        "finished_at": finished_iso,
        "duration_ms": duration_ms,
        "topics_considered": topics_considered,
        "articles_created": articles_created,
        "cost_usd": round(total_cost + image_cost, 4),
        "model": cfg.writer_model,
        "error": err,
        "metadata": {
            "openai_cost_usd": round(total_cost, 4),
            "image_cost_usd": round(image_cost, 4),
        },
    })

    await log.flush()
    await api.aclose()
    return {
        "run_id": run_id,
        "articles_created": articles_created,
        "cost_usd": round(total_cost + image_cost, 4),
        "error": err,
    }


# httpx import only when needed in run_pipeline; do it here for type checkers
import httpx  # noqa: E402


def main() -> None:
    cfg = Config.from_env()
    result = asyncio.run(run_pipeline(cfg, trigger="manual"))
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
