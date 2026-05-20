"""Tests for the SEC EDGAR primary-source client."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import httpx
import pytest

from technotimes_agents.sources import TECH_CIKS, fetch_recent_filings
from technotimes_agents.sources.sec_edgar import SEC_USER_AGENT


def _atom(entries: str) -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<feed xmlns="http://www.w3.org/2005/Atom">\n'
        "<title>EDGAR latest filings</title>\n"
        f"{entries}\n"
        "</feed>"
    )


def _entry(form: str, company: str, cik: str, updated: str, url: str) -> str:
    return (
        "<entry>\n"
        f"  <title>{form} - {company} ({cik}) (Filer)</title>\n"
        f'  <link rel="alternate" type="text/html" href="{url}"/>\n'
        f'  <category scheme="https://www.sec.gov/" '
        f'label="form type" term="{form}"/>\n'
        f"  <updated>{updated}</updated>\n"
        f"  <summary>Material event filing for {company}.</summary>\n"
        "</entry>"
    )


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "-04:00")


def _patch_transport(monkeypatch, handler) -> None:
    transport = httpx.MockTransport(handler)
    original = httpx.AsyncClient

    class PatchedAsyncClient(original):
        def __init__(self, *args, **kwargs):
            kwargs.setdefault("transport", transport)
            super().__init__(*args, **kwargs)

    monkeypatch.setattr(httpx, "AsyncClient", PatchedAsyncClient)


@pytest.mark.asyncio
async def test_parses_form_cik_company_and_url(monkeypatch):
    now = datetime.now(timezone.utc)
    apple_url = "https://www.sec.gov/Archives/edgar/data/320193/apple-8k.htm"
    body = _atom(_entry(
        "8-K", "APPLE INC", "0000320193",
        now.isoformat().replace("+00:00", "Z"), apple_url,
    ))

    captured = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        captured["host"] = request.url.host
        captured["ua"] = request.headers.get("User-Agent")
        return httpx.Response(200, text=body)

    _patch_transport(monkeypatch, handler)

    filings = await fetch_recent_filings(since_minutes=30)
    assert len(filings) == 1
    f = filings[0]
    assert f.raw["form"] == "8-K"
    assert f.raw["cik"] == 320193
    assert f.raw["company"] == "Apple Inc."
    assert f.url == apple_url
    assert f.provider == "sec-edgar"
    assert f.provider_kind == "sec-edgar"
    assert f.is_primary is True
    # SEC requires a descriptive User-Agent or it blocks the request.
    assert captured["ua"] == SEC_USER_AGENT
    assert captured["host"] == "www.sec.gov"


@pytest.mark.asyncio
async def test_since_minutes_filter_drops_stale_filings(monkeypatch):
    now = datetime.now(timezone.utc)
    fresh = now - timedelta(minutes=10)
    stale = now - timedelta(minutes=120)
    body = _atom("\n".join([
        _entry("8-K", "APPLE INC", "0000320193",
               fresh.isoformat().replace("+00:00", "Z"),
               "https://sec.gov/apple-fresh.htm"),
        _entry("8-K", "MICROSOFT CORP", "0000789019",
               stale.isoformat().replace("+00:00", "Z"),
               "https://sec.gov/msft-stale.htm"),
    ]))

    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=body)

    _patch_transport(monkeypatch, handler)

    filings = await fetch_recent_filings(since_minutes=30)
    assert len(filings) == 1
    assert filings[0].raw["cik"] == 320193  # only the fresh Apple filing


@pytest.mark.asyncio
async def test_tech_ciks_filter_drops_non_tech_filers(monkeypatch):
    now = datetime.now(timezone.utc)
    ts = now.isoformat().replace("+00:00", "Z")
    body = _atom("\n".join([
        # Apple — in TECH_CIKS, should survive.
        _entry("8-K", "APPLE INC", "0000320193", ts,
               "https://sec.gov/apple.htm"),
        # A random non-tech filer CIK — must be dropped.
        _entry("8-K", "SOME RANDOM BANK CORP", "0001999999", ts,
               "https://sec.gov/bank.htm"),
    ]))

    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=body)

    _patch_transport(monkeypatch, handler)

    filings = await fetch_recent_filings(since_minutes=30)
    assert len(filings) == 1
    assert filings[0].raw["cik"] == 320193
    assert 320193 in TECH_CIKS
    assert 1999999 not in TECH_CIKS


@pytest.mark.asyncio
async def test_non_newsworthy_forms_are_dropped(monkeypatch):
    now = datetime.now(timezone.utc)
    ts = now.isoformat().replace("+00:00", "Z")
    body = _atom("\n".join([
        # 8-K is newsworthy.
        _entry("8-K", "NVIDIA CORP", "0001045810", ts,
               "https://sec.gov/nvda-8k.htm"),
        # Form 4 (insider trade) is NOT in NEWSWORTHY_FORMS.
        _entry("4", "NVIDIA CORP", "0001045810", ts,
               "https://sec.gov/nvda-form4.htm"),
    ]))

    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=body)

    _patch_transport(monkeypatch, handler)

    filings = await fetch_recent_filings(since_minutes=30)
    assert len(filings) == 1
    assert filings[0].raw["form"] == "8-K"


def test_tech_ciks_has_roughly_fifty_companies():
    # The roster is curated to ~50 large tech issuers.
    assert 45 <= len(TECH_CIKS) <= 60
    # Spot-check a few well-known CIKs.
    assert TECH_CIKS[320193] == "Apple Inc."
    assert TECH_CIKS[1045810] == "NVIDIA Corp."
    assert TECH_CIKS[1318605] == "Tesla Inc."
