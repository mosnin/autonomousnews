"""Tests for the USPTO (PatentsView) primary-source client."""
from __future__ import annotations

import json
from datetime import date, datetime, timedelta, timezone

import httpx
import pytest

from technotimes_agents.sources import USPTO_CPC_PREFIXES, fetch_recent_grants


def _patent(
    patent_id: str,
    title: str,
    abstract: str,
    patent_date: str,
    cpc_subclass: str,
    assignee: str | None = None,
) -> dict:
    return {
        "patent_id": patent_id,
        "patent_title": title,
        "patent_abstract": abstract,
        "patent_date": patent_date,
        "cpc_current": [
            {"cpc_group_id": cpc_subclass, "cpc_subclass_id": cpc_subclass}
        ],
        "assignees": (
            [{"assignee_organization": assignee}] if assignee else []
        ),
    }


def _body(patents: list[dict]) -> str:
    return json.dumps({
        "error": False,
        "count": len(patents),
        "total_hits": len(patents),
        "patents": patents,
    })


def _patch_transport(monkeypatch, handler) -> None:
    transport = httpx.MockTransport(handler)
    original = httpx.AsyncClient

    class PatchedAsyncClient(original):
        def __init__(self, *args, **kwargs):
            kwargs.setdefault("transport", transport)
            super().__init__(*args, **kwargs)

    monkeypatch.setattr(httpx, "AsyncClient", PatchedAsyncClient)


@pytest.mark.asyncio
async def test_parses_patent_fields(monkeypatch):
    today = date.today().isoformat()
    body = _body([_patent(
        "12345678",
        "Neural network accelerator with dynamic precision",
        "A hardware accelerator for machine-learning inference.",
        today,
        "G06N",
        assignee="Example Labs Inc.",
    )])

    captured = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        captured["method"] = request.method
        captured["host"] = request.url.host
        captured["json"] = json.loads(request.content.decode())
        return httpx.Response(200, text=body)

    _patch_transport(monkeypatch, handler)

    grants = await fetch_recent_grants(since_days=1)
    assert len(grants) == 1
    g = grants[0]
    assert g.title == "Neural network accelerator with dynamic precision"
    assert g.description.startswith("A hardware accelerator")
    assert g.url == "https://patents.google.com/patent/US12345678"
    assert g.source == "USPTO"
    assert g.provider == "uspto"
    assert g.provider_kind == "uspto"
    assert g.is_primary is True
    assert g.raw["patent_id"] == "12345678"
    assert g.raw["assignees"] == ["Example Labs Inc."]
    assert g.author == "Example Labs Inc."
    # The client POSTs a JSON query to PatentsView.
    assert captured["method"] == "POST"
    assert captured["host"] == "search.patentsview.org"
    assert "q" in captured["json"]


@pytest.mark.asyncio
async def test_since_days_filter_drops_old_grants(monkeypatch):
    today = datetime.now(timezone.utc).date()
    fresh = today.isoformat()
    stale = (today - timedelta(days=10)).isoformat()
    body = _body([
        _patent("11111111", "Fresh patent", "Fresh.", fresh, "G06F"),
        _patent("22222222", "Stale patent", "Stale.", stale, "H04L"),
    ])

    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=body)

    _patch_transport(monkeypatch, handler)

    grants = await fetch_recent_grants(since_days=1)
    assert len(grants) == 1
    assert grants[0].raw["patent_id"] == "11111111"


@pytest.mark.asyncio
async def test_off_topic_cpc_is_dropped(monkeypatch):
    today = date.today().isoformat()
    body = _body([
        # G06 — tech-relevant, kept.
        _patent("33333333", "Computing patent", "Tech.", today, "G06F"),
        # A47 (furniture) — off-topic, dropped by the local CPC re-check.
        _patent("44444444", "Chair patent", "Furniture.", today, "A47C"),
    ])

    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=body)

    _patch_transport(monkeypatch, handler)

    grants = await fetch_recent_grants(since_days=1)
    assert len(grants) == 1
    assert grants[0].raw["patent_id"] == "33333333"


@pytest.mark.asyncio
async def test_optional_api_key_sent_when_set(monkeypatch):
    monkeypatch.setenv("PATENTSVIEW_API_KEY", "secret-key-123")
    captured = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        captured["api_key"] = request.headers.get("X-Api-Key")
        return httpx.Response(200, text=_body([]))

    _patch_transport(monkeypatch, handler)

    await fetch_recent_grants(since_days=1)
    assert captured["api_key"] == "secret-key-123"


@pytest.mark.asyncio
async def test_no_api_key_header_when_unset(monkeypatch):
    monkeypatch.delenv("PATENTSVIEW_API_KEY", raising=False)
    monkeypatch.delenv("USPTO_API_KEY", raising=False)
    captured = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        captured["api_key"] = request.headers.get("X-Api-Key")
        return httpx.Response(200, text=_body([]))

    _patch_transport(monkeypatch, handler)

    await fetch_recent_grants(since_days=1)
    assert captured["api_key"] is None


@pytest.mark.asyncio
async def test_http_error_is_graceful_noop(monkeypatch):
    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, text="service unavailable")

    _patch_transport(monkeypatch, handler)

    # The pipeline wraps every client in a try/except; the client itself
    # raises on HTTP error and the wrapper returns []. Confirm it raises
    # cleanly (httpx error) rather than producing garbage.
    with pytest.raises(httpx.HTTPStatusError):
        await fetch_recent_grants(since_days=1)


def test_cpc_prefixes_are_the_tech_classes():
    assert USPTO_CPC_PREFIXES == ("G06", "H04", "G06N")
