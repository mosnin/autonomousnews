"""News-source clients.

This package fans out across two *aggregator* providers (newsapi.org,
thenewsapi.com) and two *primary* sources (SEC EDGAR filings, arXiv papers).
Primary sources are upstream of the aggregators — we reach them first, which
is the entire point: first-with-the-news, not last-to-rewrite-it.

`Trend`, `Cluster`, and the dedupe/cluster helpers live here so every client
module can import them without a cycle. The fetch functions are re-exported
so the historical ``from .sources import fetch_newsapi_top_headlines`` import
in ``pipeline.py`` keeps resolving after the package refactor.
"""
from __future__ import annotations

from ._models import Cluster, ProviderKind, Trend

# Re-export the per-provider fetch functions so callers can keep doing
# `from .sources import fetch_newsapi_top_headlines, ...` unchanged.
from .arxiv import ARXIV_CATEGORIES, fetch_recent_papers
from .newsapi import fetch_newsapi_top_headlines
from .sec_edgar import TECH_CIKS, fetch_recent_filings
from .thenewsapi import fetch_thenewsapi_top

__all__ = [
    "Trend",
    "Cluster",
    "ProviderKind",
    "dedupe_trends",
    "cluster_trends_by_topic",
    "guess_category",
    "TECH_CIKS",
    "ARXIV_CATEGORIES",
    "fetch_newsapi_top_headlines",
    "fetch_thenewsapi_top",
    "fetch_recent_filings",
    "fetch_recent_papers",
]


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
