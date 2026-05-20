"""thenewsapi.com client.

An *aggregator* provider: thenewsapi.com republishes primary sources, so
trends from here are flagged ``is_primary=False``.
"""
from __future__ import annotations

import httpx

from ._models import Trend


async def fetch_thenewsapi_top(
    token: str,
    language: str = "en",
    limit: int = 50,
) -> list[Trend]:
    """https://www.thenewsapi.com/documentation"""
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(
            "https://api.thenewsapi.com/v1/news/top",
            params={
                "api_token": token,
                "language": language,
                "limit": limit,
            },
        )
        r.raise_for_status()
        data = r.json()

    out: list[Trend] = []
    for a in data.get("data", []):
        author_raw = a.get("author")
        author = author_raw.strip() if isinstance(author_raw, str) else None
        out.append(Trend(
            title=a.get("title") or "",
            description=a.get("description") or a.get("snippet"),
            url=a.get("url"),
            image_url=a.get("image_url"),
            source=a.get("source") or "thenewsapi",
            provider="thenewsapi",
            published_at=a.get("published_at"),
            raw=a,
            author=author or None,
            provider_kind="thenewsapi",
            is_primary=False,
        ))
    return [t for t in out if t.title]
