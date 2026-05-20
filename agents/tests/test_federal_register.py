"""Tests for the Federal Register primary-source client."""
from __future__ import annotations

import json
from datetime import date, datetime, timedelta, timezone

import httpx
import pytest

from technotimes_agents.sources import (
    FEDERAL_REGISTER_AGENCIES,
    fetch_recent_documents,
)


def _doc(
    title: str,
    abstract: str | None,
    doc_type: str,
    pub_date: str,
    agency: str,
    document_number: str = "2026-00001",
) -> dict:
    return {
        "title": title,
        "abstract": abstract,
        "type": doc_type,
        "html_url": (
            f"https://www.federalregister.gov/documents/"
            f"{document_number}/{title.lower().replace(' ', '-')}"
        ),
        "publication_date": pub_date,
        "document_number": document_number,
        "agencies": [
            {"name": agency, "raw_name": agency.upper(), "slug": "x"}
        ],
    }


def _body(docs: list[dict]) -> str:
    return json.dumps({
        "count": len(docs),
        "total_pages": 1,
        "results": docs,
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
async def test_parses_document_fields(monkeypatch):
    today = date.today().isoformat()
    body = _body([_doc(
        "Broadcast Station Rule Updates",
        "The FCC adopts updates to several broadcast rules.",
        "Rule",
        today,
        "Federal Communications Commission",
    )])

    captured = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        captured["host"] = request.url.host
        captured["params"] = request.url.params.multi_items()
        return httpx.Response(200, text=body)

    _patch_transport(monkeypatch, handler)

    docs = await fetch_recent_documents(since_days=1)
    assert len(docs) == 1
    d = docs[0]
    assert d.title == "Broadcast Station Rule Updates"
    assert d.description == "The FCC adopts updates to several broadcast rules."
    assert d.source == "Federal Communications Commission"
    assert d.provider == "federal-register"
    assert d.provider_kind == "federal-register"
    assert d.is_primary is True
    assert d.raw["type"] == "Rule"
    assert d.url.startswith("https://www.federalregister.gov/documents/")
    assert captured["host"] == "www.federalregister.gov"
    # The query must filter to the tracked tech agencies.
    agency_params = [
        v for k, v in captured["params"]
        if k == "conditions[agencies][]"
    ]
    for slug in FEDERAL_REGISTER_AGENCIES:
        assert slug in agency_params


@pytest.mark.asyncio
async def test_publication_date_filter_drops_old_documents(monkeypatch):
    today = datetime.now(timezone.utc).date()
    fresh = today.isoformat()
    stale = (today - timedelta(days=10)).isoformat()
    body = _body([
        _doc("Fresh notice", "Fresh.", "Notice", fresh,
             "Federal Trade Commission"),
        _doc("Stale notice", "Stale.", "Notice", stale,
             "Federal Trade Commission"),
    ])

    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=body)

    _patch_transport(monkeypatch, handler)

    docs = await fetch_recent_documents(since_days=1)
    assert len(docs) == 1
    assert docs[0].title == "Fresh notice"


@pytest.mark.asyncio
async def test_non_newsworthy_type_is_dropped(monkeypatch):
    today = date.today().isoformat()
    body = _body([
        _doc("A real rule", "Rule.", "Rule", today,
             "National Institute of Standards and Technology"),
        # "Presidential Document" is not in NEWSWORTHY_TYPES.
        _doc("A proclamation", "Proc.", "Presidential Document", today,
             "National Institute of Standards and Technology"),
    ])

    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=body)

    _patch_transport(monkeypatch, handler)

    docs = await fetch_recent_documents(since_days=1)
    assert len(docs) == 1
    assert docs[0].title == "A real rule"


@pytest.mark.asyncio
async def test_null_abstract_gets_fallback_description(monkeypatch):
    today = date.today().isoformat()
    body = _body([_doc(
        "Early Termination Notice", None, "Notice", today,
        "Federal Trade Commission",
    )])

    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=body)

    _patch_transport(monkeypatch, handler)

    docs = await fetch_recent_documents(since_days=1)
    assert len(docs) == 1
    assert docs[0].description
    assert "Federal Trade Commission" in docs[0].description


@pytest.mark.asyncio
async def test_http_error_raises_for_pipeline_wrapper(monkeypatch):
    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, text="server error")

    _patch_transport(monkeypatch, handler)

    with pytest.raises(httpx.HTTPStatusError):
        await fetch_recent_documents(since_days=1)


def test_tracked_agencies_include_the_tech_regulators():
    assert "federal-communications-commission" in FEDERAL_REGISTER_AGENCIES
    assert "federal-trade-commission" in FEDERAL_REGISTER_AGENCIES
    assert "industry-and-security-bureau" in FEDERAL_REGISTER_AGENCIES
    assert len(FEDERAL_REGISTER_AGENCIES) == 6
