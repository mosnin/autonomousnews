"""Test the news-source clients against captured API shapes."""
from __future__ import annotations

import json

import httpx
import pytest

from technotimes_agents.sources import (
    Trend,
    cluster_trends_by_topic,
    dedupe_trends,
    fetch_newsapi_top_headlines,
    fetch_thenewsapi_top,
    guess_category,
)


NEWSAPI_RESPONSE = {
    "status": "ok",
    "totalResults": 2,
    "articles": [
        {
            "source": {"id": "reuters", "name": "Reuters"},
            "author": "Jane Doe",
            "title": "Big chip deal closes",
            "description": "A description.",
            "url": "https://reuters.example/story",
            "urlToImage": "https://reuters.example/img.jpg",
            "publishedAt": "2026-05-16T10:00:00Z",
            "content": "...",
        },
        {
            "source": {"name": "AP"},
            "title": "Different headline",
            "description": "",
            "url": "https://ap.example/x",
            "urlToImage": None,
            "publishedAt": "2026-05-16T09:00:00Z",
        },
    ],
}


THENEWSAPI_RESPONSE = {
    "meta": {"found": 1, "returned": 1, "limit": 25, "page": 1},
    "data": [
        {
            "uuid": "abc",
            "title": "Big chip deal closes",  # duplicate by normalized title
            "description": "Same story, different desk",
            "snippet": "Snippet text",
            "url": "https://other.example/x",
            "image_url": "https://other.example/img.jpg",
            "language": "en",
            "published_at": "2026-05-16T10:30:00.000Z",
            "source": "AnotherWire",
        },
    ],
}


@pytest.mark.asyncio
async def test_fetch_newsapi_parses_top_headlines(monkeypatch):
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.host == "newsapi.org"
        assert request.headers["X-Api-Key"] == "test-key"
        return httpx.Response(200, json=NEWSAPI_RESPONSE)

    transport = httpx.MockTransport(handler)

    # Patch the AsyncClient used inside the source module.
    original = httpx.AsyncClient

    class PatchedAsyncClient(original):
        def __init__(self, *args, **kwargs):
            kwargs.setdefault("transport", transport)
            super().__init__(*args, **kwargs)

    monkeypatch.setattr(httpx, "AsyncClient", PatchedAsyncClient)

    trends = await fetch_newsapi_top_headlines("test-key")
    assert len(trends) == 2
    assert trends[0].provider == "newsapi"
    assert trends[0].source == "Reuters"
    assert trends[0].image_url == "https://reuters.example/img.jpg"


@pytest.mark.asyncio
async def test_fetch_thenewsapi_parses_top(monkeypatch):
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.host == "api.thenewsapi.com"
        assert "api_token=test-token" in request.url.query.decode()
        return httpx.Response(200, json=THENEWSAPI_RESPONSE)

    transport = httpx.MockTransport(handler)

    original = httpx.AsyncClient

    class PatchedAsyncClient(original):
        def __init__(self, *args, **kwargs):
            kwargs.setdefault("transport", transport)
            super().__init__(*args, **kwargs)

    monkeypatch.setattr(httpx, "AsyncClient", PatchedAsyncClient)

    trends = await fetch_thenewsapi_top("test-token")
    assert len(trends) == 1
    assert trends[0].provider == "thenewsapi"
    assert trends[0].title == "Big chip deal closes"


def test_dedupe_trends_drops_near_duplicates_by_normalized_title():
    # Re-use the Trend shape via the existing dataclass by importing it.
    from technotimes_agents.sources import Trend

    a = Trend(
        title="OpenAI Launches Thing",
        description=None,
        url="https://a.example",
        image_url=None,
        source="A",
        provider="newsapi",
        published_at=None,
        raw={},
    )
    b = Trend(
        title="openai launches thing",  # same alnum prefix
        description=None,
        url="https://b.example",
        image_url=None,
        source="B",
        provider="thenewsapi",
        published_at=None,
        raw={},
    )
    c = Trend(
        title="Different story entirely",
        description=None,
        url="https://c.example",
        image_url=None,
        source="C",
        provider="newsapi",
        published_at=None,
        raw={},
    )
    out = dedupe_trends([a, b, c])
    assert len(out) == 2
    titles = [t.title for t in out]
    assert "OpenAI Launches Thing" in titles
    assert "Different story entirely" in titles


def _trend(title: str, url: str, source: str = "Wire") -> Trend:
    return Trend(
        title=title,
        description=None,
        url=url,
        image_url=None,
        source=source,
        provider="newsapi",
        published_at=None,
        raw={},
    )


def test_cluster_trends_groups_same_story_across_publications():
    a = _trend("OpenAI Launches Thing", "https://reuters.example/a", "Reuters")
    b = _trend("openai launches thing", "https://bloomberg.example/b", "Bloomberg")
    c = _trend("Mars rover finds water", "https://nasa.example/c", "NASA")
    clusters = cluster_trends_by_topic([a, b, c])
    assert len(clusters) == 2
    by_key = {cl.topic_key: cl for cl in clusters}
    openai_cluster = next(
        cl for cl in clusters if "openai" in cl.primary.title.lower()
    )
    assert len(openai_cluster.sources) == 2
    pubs = {s.source for s in openai_cluster.sources}
    assert pubs == {"Reuters", "Bloomberg"}
    mars = next(cl for cl in clusters if "mars" in cl.primary.title.lower())
    assert len(mars.sources) == 1
    # by_key references topic_key shape (used by editor lookup)
    assert all(isinstance(k, str) and k for k in by_key)


def test_cluster_trends_dedupes_sources_within_cluster_by_url():
    a = _trend("Same story", "https://x.example/a", "Reuters")
    a_dup = _trend("Same story", "https://x.example/a", "Reuters")
    b = _trend("Same story", "https://y.example/b", "Bloomberg")
    clusters = cluster_trends_by_topic([a, a_dup, b])
    assert len(clusters) == 1
    assert len(clusters[0].sources) == 2  # dup-URL dropped


def test_guess_category_routes_ai_topics_to_ai_and_ml():
    cat, sub = guess_category("OpenAI launches new model")
    assert cat == "technology"
    assert sub == "ai-and-ml"


def test_guess_category_returns_none_for_unknown_topic():
    cat, sub = guess_category("Local bakery wins award")
    assert cat is None and sub is None


# Silence ruff for json import (used only via type hints elsewhere).
_ = json
