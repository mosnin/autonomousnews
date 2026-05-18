"""Tests for the outbound-link validator.

Two rejection cases:
  1. The writer introduced a URL that is NOT in the cluster's allow-list.
  2. A URL in the allow-list returns 4xx/5xx OR is unreachable.

Plus a happy-path case where every link is allowed AND returns 200.
"""
from __future__ import annotations

import httpx
import pytest

from technotimes_agents.link_validator import (
    extract_external_links,
    validate_outbound_links,
)


def test_extract_external_links_returns_only_http_urls():
    body = (
        "Lorem ipsum [Bloomberg](https://www.bloomberg.com/news/x) and "
        "[Reuters](http://reuters.com/y). Internal [back](/business) link. "
        "Anchor [no-href](#section)."
    )
    out = extract_external_links(body)
    assert out == [
        "https://www.bloomberg.com/news/x",
        "http://reuters.com/y",
    ]


def test_extract_external_links_dedupes():
    body = (
        "[a](https://a.example/x) and [b](https://a.example/x) and "
        "[c](https://b.example/y)"
    )
    out = extract_external_links(body)
    assert out == ["https://a.example/x", "https://b.example/y"]


def _client_with_handler(handler):
    transport = httpx.MockTransport(handler)
    return httpx.AsyncClient(transport=transport, follow_redirects=True)


@pytest.mark.asyncio
async def test_rejects_url_not_in_allowed_set():
    body = "From [Bloomberg](https://bloomberg.example/a) and [Fake](https://invented.example/b)."
    allowed = ["https://bloomberg.example/a"]

    async def handler(request: httpx.Request) -> httpx.Response:
        # We should never reach the network — invented-URL check happens first.
        raise AssertionError("validator should not have issued any request")

    client = _client_with_handler(handler)
    try:
        result = await validate_outbound_links(body, allowed, client=client)
    finally:
        await client.aclose()

    assert result.ok is False
    assert "invented.example" in (result.reason or "")
    assert "https://invented.example/b" in result.invented_urls
    assert result.dead_urls == []


@pytest.mark.asyncio
async def test_rejects_dead_link_in_allowed_set():
    body = (
        "Reported by [Bloomberg](https://ok.example/a) and "
        "[Reuters](https://broken.example/b)."
    )
    allowed = ["https://ok.example/a", "https://broken.example/b"]

    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "ok.example":
            return httpx.Response(200)
        # broken.example: HEAD AND GET both fail
        return httpx.Response(503)

    client = _client_with_handler(handler)
    try:
        result = await validate_outbound_links(body, allowed, client=client)
    finally:
        await client.aclose()

    assert result.ok is False
    assert "https://broken.example/b" in result.dead_urls
    assert result.invented_urls == []


@pytest.mark.asyncio
async def test_passes_when_all_links_allowed_and_live():
    body = (
        "From [Bloomberg](https://bloomberg.example/a) and "
        "[Reuters](https://reuters.example/b). Sources: Bloomberg, Reuters."
    )
    allowed = ["https://bloomberg.example/a", "https://reuters.example/b"]

    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200)

    client = _client_with_handler(handler)
    try:
        result = await validate_outbound_links(body, allowed, client=client)
    finally:
        await client.aclose()

    assert result.ok is True
    assert result.reason is None
    assert result.invented_urls == []
    assert result.dead_urls == []


@pytest.mark.asyncio
async def test_passes_when_body_has_no_external_links():
    body = "Just plain prose with no markdown links of any kind."
    result = await validate_outbound_links(body, [])
    assert result.ok is True


@pytest.mark.asyncio
async def test_connection_error_counts_as_dead():
    body = "Cited by [Bloomberg](https://bloomberg.example/a)."
    allowed = ["https://bloomberg.example/a"]

    async def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("nope")

    client = _client_with_handler(handler)
    try:
        result = await validate_outbound_links(body, allowed, client=client)
    finally:
        await client.aclose()

    assert result.ok is False
    assert "https://bloomberg.example/a" in result.dead_urls


@pytest.mark.asyncio
async def test_head_405_falls_back_to_get():
    """Some servers return 405 on HEAD; the validator should retry GET."""
    body = "Cited by [Bloomberg](https://bloomberg.example/a)."
    allowed = ["https://bloomberg.example/a"]

    async def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "HEAD":
            return httpx.Response(405)
        return httpx.Response(200)

    client = _client_with_handler(handler)
    try:
        result = await validate_outbound_links(body, allowed, client=client)
    finally:
        await client.aclose()

    assert result.ok is True
