"""News-source clients: newsapi.org + thenewsapi.com."""
from __future__ import annotations

from dataclasses import dataclass, field
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
    # Byline of the source article when the provider exposes it. Empty
    # strings from upstream are normalized to None so downstream "is the
    # author known?" checks stay simple.
    author: str | None = None


@dataclass
class Cluster:
    """A topic cluster: multiple Trend records about the same underlying story.

    Built by `cluster_trends_by_topic` from the deduped trend stream. The
    writer pipeline uses the full source list (rather than a single picked
    Trend) so the article can REPORT and CITE rather than fabricate detail.
    """

    topic_key: str  # normalized title key, shared by all sources in cluster
    category_slug: str | None
    subcategory_slug: str | None
    sources: list[Trend] = field(default_factory=list)

    @property
    def primary(self) -> Trend:
        return self.sources[0]


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
        ))
    return [t for t in out if t.title]


def _title_key(title: str) -> str:
    return "".join(c for c in title.lower() if c.isalnum())[:80]


def dedupe_trends(trends: list[Trend]) -> list[Trend]:
    """Drop near-duplicate headlines across providers by normalized title."""
    seen: set[str] = set()
    out: list[Trend] = []
    for t in trends:
        key = _title_key(t.title)
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(t)
    return out


# Hand-tuned routing hints: title-keyword -> (category_slug, subcategory_slug).
# Used only as an initial guess for cluster routing; the editor can override.
_CATEGORY_HINTS: tuple[tuple[tuple[str, ...], str, str | None], ...] = (
    (("openai", "anthropic", "chatgpt", "claude", "gemini", "llm", "model"),
     "technology", "ai-and-ml"),
    (("chip", "semiconductor", "nvidia", "tsmc", "amd", "intel", "arm"),
     "technology", "hardware-and-chips"),
    (("hack", "breach", "ransomware", "vulnerability", "cve", "exploit"),
     "technology", "cybersecurity"),
    (("startup", "venture", "series ", "raises ", "funding round"),
     "business", "startups-and-venture"),
    (("crypto", "bitcoin", "ethereum", "stablecoin", "blockchain"),
     "business", "crypto-and-fintech"),
    (("market", "stocks", "shares", "wall street", "dow", "nasdaq"),
     "business", "markets"),
    (("netflix", "disney", "streaming", "studio", "spotify"),
     "business", "media-and-streaming"),
    (("nasa", "spacex", "rocket", "orbit", "satellite", "mars"),
     "science", "space"),
    (("gene", "crispr", "clinical trial", "drug ", "vaccine"),
     "science", "biotech"),
    (("climate", "carbon", "emissions", "warming"),
     "climate", "climate-science"),
    (("solar", "wind farm", "battery", "grid"),
     "climate", "clean-energy"),
    (("ev ", "electric vehicle", "tesla", "byd"),
     "climate", "transportation"),
    (("antitrust", "monopoly", "competition law"),
     "policy", "antitrust-and-regulation"),
    (("privacy", "gdpr", "data protection"),
     "policy", "privacy-and-data"),
    (("export control", "tariff", "sanction", "geopolit"),
     "policy", "geopolitics-of-tech"),
)


def guess_category(title: str) -> tuple[str | None, str | None]:
    """Heuristic routing for a cluster. Editor can always override."""
    t = title.lower()
    for keywords, cat, sub in _CATEGORY_HINTS:
        for kw in keywords:
            if kw in t:
                return cat, sub
    return None, None


def cluster_trends_by_topic(trends: list[Trend]) -> list[Cluster]:
    """Group trends sharing a normalized title into Cluster objects.

    Sources within a cluster are deduplicated by URL (different providers
    sometimes surface the exact same article URL). Order preserved.
    """
    buckets: dict[str, Cluster] = {}
    for t in trends:
        if not t.title:
            continue
        key = _title_key(t.title)
        if not key:
            continue
        cluster = buckets.get(key)
        if cluster is None:
            cat, sub = guess_category(t.title)
            cluster = Cluster(
                topic_key=key,
                category_slug=cat,
                subcategory_slug=sub,
                sources=[],
            )
            buckets[key] = cluster
        # Dedupe sources within a cluster on URL.
        if t.url and any(s.url == t.url for s in cluster.sources):
            continue
        cluster.sources.append(t)
    return list(buckets.values())
