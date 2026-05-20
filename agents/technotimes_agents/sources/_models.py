"""Shared data models for the source clients.

`Trend` and `Cluster` live in their own module (rather than in
``sources/__init__.py``) so the per-provider client modules can import them
without a circular import: ``__init__`` imports the clients, the clients
import from here, and ``_models`` imports nothing from the package.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

ProviderKind = Literal["newsapi", "thenewsapi", "sec-edgar", "arxiv"]


@dataclass
class Trend:
    title: str
    description: str | None
    url: str | None
    image_url: str | None
    source: str  # publication name
    provider: str  # 'newsapi' | 'thenewsapi' | 'sec-edgar' | 'arxiv'
    published_at: str | None
    raw: dict[str, Any]
    # Byline of the source article when the provider exposes it. Empty
    # strings from upstream are normalized to None so downstream "is the
    # author known?" checks stay simple.
    author: str | None = None
    # Coarse provider classification. `provider` is the exact client name;
    # `provider_kind` is the constrained enum the pipeline branches on.
    # Defaulted so existing Trend construction (and tests) don't break.
    provider_kind: ProviderKind = "newsapi"
    # True for primary sources (SEC EDGAR, arXiv). These are upstream of the
    # aggregators; a fresh primary trend in a cluster makes it "breaking".
    is_primary: bool = False


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
