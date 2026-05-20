"""newsapi.org client.

An *aggregator* provider: newsapi.org itself rewrites/republishes primary
sources, so trends from here are flagged ``is_primary=False``.
"""
from __future__ import annotations

import httpx

from ._models import Trend


async def fetch_newsapi_top_headlines(
    api_key: str,
    language: str = "en",
    page_size: int = 50,
) -> list[Trend]:
    """https://newsapi.org/docs/endpoints/top-headlines"""
    async with httpx.AsyncClient(timeout=20) as client:
        # 'top-headlines' without country gives global; add `country` if you
        # want a single-country edition (we don't, per the spec).
        r = await client.get(
            "https://newsapi.org/v2/top-headlines",
            params={"language": language, "pageSize": page_size},
            headers={"X-Api-Key": api_key},
        )
        r.raise_for_status()
        data = r.json()

    out: list[Trend] = []
    for a in data.get("articles", []):
        author_raw = a.get("author")
        author = author_raw.strip() if isinstance(author_raw, str) else None
        out.append(Trend(
            title=a.get("title") or "",
            description=a.get("description"),
            url=a.get("url"),
            image_url=a.get("urlToImage"),
            source=(a.get("source") or {}).get("name") or "newsapi",
            provider="newsapi",
            published_at=a.get("publishedAt"),
            raw=a,
            author=author or None,
            provider_kind="newsapi",
            is_primary=False,
        ))
    return [t for t in out if t.title]
