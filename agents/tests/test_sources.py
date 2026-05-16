"""Test the news-source clients against captured API shapes."""
from __future__ import annotations

import json

import httpx
import pytest

from technotimes_agents.sources import (
    dedupe_trends,
    fetch_newsapi_top_headlines,
    fetch_thenewsapi_top,
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


# Silence ruff for json import (used only via type hints elsewhere).
_ = json
