"""Pillar-page generator.

Produces evergreen 'everything you need to know about X' topic guides for
every subcategory in the taxonomy. Runs on a weekly Modal schedule.

Each pillar is ~2,000 words plus a glossary, a timeline, and a Q&A — the
kind of reference content that ranks for head terms over years (where
breaking news only ranks for hours).

Same wire format as articles: posts to /api/agent/pillars with the same
SEO contract (focus keyword + long-tail + power word + FAQ).
"""
from __future__ import annotations

import asyncio
import json
import time
import uuid
from typing import Any

import httpx
from openai import AsyncOpenAI

from .api_client import ApiClient, LogBuffer
from .config import Config
from .pipeline import POWER_WORDS, estimate_cost
from .taxonomy import CATEGORIES, all_pairs


PILLAR_SYSTEM = """You are the senior editor at Techno Times, writing
an evergreen 'everything you need to know about X' topic guide.

This is REFERENCE content, not breaking news. It will be read months from
now and should stay accurate for that long. It sits above the article grid
on a subcategory page and is meant to rank for the head term that
describes the subcategory itself.

Voice: neutral, informative, NYT-style. Authoritative without being dry.
Avoid speculation, opinion, partisanship, and YMYL advice.

You MUST satisfy ALL of these SEO requirements:

- focus_keyword: 2–5 word phrase the guide targets. The subcategory name
  itself is usually a good starting point.
- long_tail_keywords: 4–6 additional high-intent phrases, often as
  questions ('what is X', 'how does X work').
- power_word in the title from this list:
  {power_words}
- title: < 100 chars, contains BOTH the power word AND the focus keyword
  verbatim. Reads like a reference page, not a listicle.
- seo_title < 70 chars, contains focus keyword.
- seo_description < 160 chars, contains focus keyword in first half.
- 2–3% keyword density across the body, distributed naturally.

CONTENT STRUCTURE (return as a single JSON object):

{{
  "focus_keyword": "...",
  "long_tail_keywords": ["...", "..."],
  "power_word": "...",
  "title": "<headline of the topic guide>",
  "dek": "<one-sentence summary, < 200 chars>",
  "overview": "<one-paragraph definition: what is X, in plain language>",
  "why_it_matters": "<2-3 sentences on why a non-expert should care>",
  "body": "<2000-2500 words. Use '## ' for H2 sections. Suggested sections: 'Background', 'How it works', 'Key players', 'Major debates', 'What comes next'. Include 1-2 '>> ' pull quotes. Include 3-5 inline markdown links to credible primary sources [text](https://url).>",
  "key_terms": [
    {{ "term": "<term>", "definition": "<one-sentence definition>" }}
  ],
  "timeline": [
    {{ "year": "<YYYY or 'Q1 2025' etc>", "event": "<one-sentence event>" }}
  ],
  "faq": [
    {{ "q": "<real-query question>", "a": "<2-4 sentence factual answer>" }}
  ],
  "related_subcategories": ["<other subcategory slug>", "..."],
  "seo_title": "...",
  "seo_description": "..."
}}

- key_terms: 5–8 entries.
- timeline: 4–8 entries, chronological.
- faq: 5–7 entries.
- related_subcategories: 2–4 sibling subcategory slugs.
"""


def all_subcategory_targets() -> list[tuple[str, str, str, str]]:
    """Returns (category_slug, category_name, subcategory_slug, subcategory_name)."""
    out: list[tuple[str, str, str, str]] = []
    for c in CATEGORIES:
        for s in c.subcategories:
            out.append((c.slug, c.name, s.slug, s.name))
    return out


def category_menu_for_related(category_slug: str) -> str:
    """List sibling subcategories so the pillar can pick 'related' ones."""
    cat = next((c for c in CATEGORIES if c.slug == category_slug), None)
    if not cat:
        return ""
    return ", ".join(s.slug for s in cat.subcategories)


async def write_pillar(
    cfg: Config,
    client: AsyncOpenAI,
    target: tuple[str, str, str, str],
    log: LogBuffer,
) -> tuple[dict[str, Any] | None, float, int, int]:
    category_slug, category_name, sub_slug, sub_name = target

    user_msg = f"""Write an evergreen topic guide for:

Subcategory: {sub_name}
Slug: {category_slug}/{sub_slug}
Parent category: {category_name}

Sibling subcategories (use slugs in 'related_subcategories'):
{category_menu_for_related(category_slug)}

Return the JSON object described in the system prompt.
"""
    try:
        resp = await client.chat.completions.create(
            model=cfg.writer_model,
            messages=[
                {
                    "role": "system",
                    "content": PILLAR_SYSTEM.format(power_words=", ".join(POWER_WORDS)),
                },
                {"role": "user", "content": user_msg},
            ],
            response_format={"type": "json_object"},
            temperature=0.5,
        )
    except Exception as e:
        await log.warn("pillar writer call failed", subcategory=sub_slug, error=str(e))
        return None, 0.0, 0, 0

    usage = resp.usage
    pt = usage.prompt_tokens if usage else 0
    ct = usage.completion_tokens if usage else 0
    cost = estimate_cost(cfg.writer_model, pt, ct)

    try:
        data = json.loads(resp.choices[0].message.content or "{}")
    except json.JSONDecodeError:
        await log.error("pillar writer returned invalid json", subcategory=sub_slug)
        return None, cost, pt, ct

    required = ("title", "overview", "body")
    if not all(data.get(k) for k in required):
        await log.warn("pillar missing required fields", subcategory=sub_slug)
        return None, cost, pt, ct

    pillar = {
        "category_slug": category_slug,
        "subcategory_slug": sub_slug,
        "title": data["title"],
        "dek": data.get("dek"),
        "overview": data["overview"],
        "body": data["body"],
        "why_it_matters": data.get("why_it_matters"),
        "focus_keyword": (data.get("focus_keyword") or "").strip() or None,
        "long_tail_keywords": data.get("long_tail_keywords", []),
        "power_word": data.get("power_word"),
        "seo_title": data.get("seo_title"),
        "seo_description": data.get("seo_description"),
        "key_terms": data.get("key_terms") or [],
        "timeline": data.get("timeline") or [],
        "faq": data.get("faq") or [],
        "related_subcategories": data.get("related_subcategories", []),
        "model_used": cfg.writer_model,
        "prompt_tokens": pt,
        "completion_tokens": ct,
        "generation_cost_usd": round(cost, 4),
    }
    return pillar, cost, pt, ct


async def run_pillar_refresh(
    cfg: Config,
    targets: list[tuple[str, str, str, str]] | None = None,
    trigger: str = "cron-weekly",
) -> dict[str, Any]:
    """Refresh some/all subcategory pillars. Targets defaults to every sub."""
    api = ApiClient(cfg.site_url, cfg.admin_api_key)
    log = LogBuffer(api, run_id=None)

    run_id = str(uuid.uuid4())
    started = time.time()
    started_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(started))

    await api.upsert_run(
        {
            "id": run_id,
            "trigger": trigger,
            "agent": "pillar-refresh",
            "status": "running",
            "started_at": started_iso,
            "model": cfg.writer_model,
        }
    )
    log.set_run_id(run_id)
    await log.info("pillar refresh started", trigger=trigger)

    total_cost = 0.0
    written = 0
    err: str | None = None
    cancelled = False

    try:
        # Budget gate same as the article pipeline.
        try:
            budget = await api.get_budget()
            await log.info("budget check", **budget)
            if budget.get("over_budget"):
                await log.warn("over daily budget — cancelling pillar refresh")
                cancelled = True
        except Exception as e:
            await log.warn("budget check failed; proceeding", error=str(e))
            budget = {"remaining_usd": float("inf")}

        if not cancelled:
            client = AsyncOpenAI(api_key=cfg.openai_api_key)
            todo = targets if targets is not None else all_subcategory_targets()
            await log.info("targets resolved", count=len(todo))

            for t in todo:
                # Per-iteration mid-run budget safety.
                remaining = float(budget.get("remaining_usd") or 0.0)
                if remaining != float("inf") and total_cost >= remaining:
                    await log.warn(
                        "mid-run budget hit — stopping",
                        spent=round(total_cost, 4),
                        remaining_at_start=remaining,
                    )
                    break

                if cfg.dry_run:
                    await log.info("dry-run skip", subcategory=f"{t[0]}/{t[2]}")
                    continue

                pillar, c, _, _ = await write_pillar(cfg, client, t, log)
                total_cost += c
                if not pillar:
                    continue
                pillar["run_id"] = run_id
                try:
                    r = await api._client.post(  # type: ignore[attr-defined]
                        f"{cfg.site_url}/api/agent/pillars",
                        json=pillar,
                    )
                    r.raise_for_status()
                    written += 1
                    await log.info(
                        "pillar written",
                        subcategory=f"{t[0]}/{t[2]}",
                        cost_usd=round(c, 4),
                    )
                except httpx.HTTPStatusError as e:
                    await log.warn(
                        "pillar POST failed",
                        subcategory=f"{t[0]}/{t[2]}",
                        status=e.response.status_code,
                        body=e.response.text[:300],
                    )
                except Exception as e:
                    await log.warn(
                        "pillar POST failed",
                        subcategory=f"{t[0]}/{t[2]}",
                        error=str(e),
                    )

    except Exception as e:  # pragma: no cover
        err = f"{type(e).__name__}: {e}"
        await log.error("pillar refresh failed", error=err)

    finished = time.time()
    finished_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(finished))
    final_status = (
        "cancelled" if cancelled else ("failed" if err else "succeeded")
    )

    await api.upsert_run(
        {
            "id": run_id,
            "trigger": trigger,
            "agent": "pillar-refresh",
            "status": final_status,
            "started_at": started_iso,
            "finished_at": finished_iso,
            "duration_ms": int((finished - started) * 1000),
            "topics_considered": (len(targets) if targets is not None else len(all_subcategory_targets())),
            "articles_created": written,
            "cost_usd": round(total_cost, 4),
            "model": cfg.writer_model,
            "error": err,
            "metadata": {"agent_kind": "pillar-refresh"},
        }
    )
    if total_cost > 0 or written:
        try:
            await api.report_cost(
                openai_cost_usd=round(total_cost, 4),
                image_cost_usd=0.0,
                articles=0,
                runs=1,
            )
        except Exception as e:
            await log.warn("cost report failed", error=str(e))

    await log.flush()
    await api.aclose()
    return {
        "run_id": run_id,
        "pillars_written": written,
        "cost_usd": round(total_cost, 4),
        "status": final_status,
        "error": err,
    }


def main() -> None:
    cfg = Config.from_env()
    result = asyncio.run(run_pillar_refresh(cfg, trigger="manual"))
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
