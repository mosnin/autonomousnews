"""News-source clients: newsapi.org + thenewsapi.com."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx


@dataclass
class Trend:
    title: str
    description: str | None
    url: str | None
    image_url: str | None
    source: str  # publication name
    provider: str  # 'newsapi' | 'thenewsapi'
    published_at: str | None
    raw: dict[str, Any]


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
        out.append(Trend(
            title=a.get("title") or "",
            description=a.get("description"),
            url=a.get("url"),
            image_url=a.get("urlToImage"),
            source=(a.get("source") or {}).get("name") or "newsapi",
            provider="newsapi",
            published_at=a.get("publishedAt"),
            raw=a,
        ))
    return [t for t in out if t.title]


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
        out.append(Trend(
            title=a.get("title") or "",
            description=a.get("description") or a.get("snippet"),
            url=a.get("url"),
            image_url=a.get("image_url"),
            source=a.get("source") or "thenewsapi",
            provider="thenewsapi",
            published_at=a.get("published_at"),
            raw=a,
        ))
    return [t for t in out if t.title]


def dedupe_trends(trends: list[Trend]) -> list[Trend]:
    """Drop near-duplicate headlines across providers by normalized title."""
    seen: set[str] = set()
    out: list[Trend] = []
    for t in trends:
        key = "".join(c for c in t.title.lower() if c.isalnum())[:80]
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(t)
    return out
