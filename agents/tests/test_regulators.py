"""Tests for the FTC / FCC / DOJ regulator press-release client."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from email.utils import format_datetime

import httpx
import pytest

from technotimes_agents.sources import fetch_recent_releases


def _rss(items: str) -> str:
    return (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<rss version="2.0"><channel>\n'
        "<title>Press Release Feed</title>\n"
        f"{items}\n"
        "</channel></rss>"
    )


def _rss_item(title: str, url: str, description: str, pub_dt: datetime) -> str:
    return (
        "<item>\n"
        f"  <title>{title}</title>\n"
        f"  <link>{url}</link>\n"
        f"  <description>{description}</description>\n"
        f"  <pubDate>{format_datetime(pub_dt)}</pubDate>\n"
        "</item>"
    )


def _atom(entries: str) -> str:
    return (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<feed xmlns="http://www.w3.org/2005/Atom">\n'
        "<title>Headlines</title>\n"
        f"{entries}\n"
        "</feed>"
    )


def _atom_entry(title: str, url: str, summary: str, dt: datetime) -> str:
    return (
        "<entry>\n"
        f"  <title>{title}</title>\n"
        f'  <link rel="alternate" href="{url}"/>\n'
        f"  <summary>{summary}</summary>\n"
        f"  <updated>{dt.isoformat().replace('+00:00', 'Z')}</updated>\n"
        "</entry>"
    )


def _patch_transport(monkeypatch, handler) -> None:
    transport = httpx.MockTransport(handler)
    original = httpx.AsyncClient

    class PatchedAsyncClient(original):
        def __init__(self, *args, **kwargs):
            kwargs.setdefault("transport", transport)
            super().__init__(*args, **kwargs)

    monkeypatch.setattr(httpx, "AsyncClient", PatchedAsyncClient)


@pytest.mark.asyncio
async def test_parses_and_merges_all_three_feeds(monkeypatch):
    now = datetime.now(timezone.utc)

    def handler_for(request: httpx.Request) -> httpx.Response:
        host = request.url.host
        if host == "www.ftc.gov":
            return httpx.Response(200, text=_rss(_rss_item(
                "FTC sues over data practices", "https://ftc.gov/a",
                "FTC enforcement action.", now - timedelta(hours=1),
            )))
        if host == "www.fcc.gov":
            # FCC headlines feed is Atom-shaped.
            return httpx.Response(200, text=_atom(_atom_entry(
                "FCC adopts spectrum order", "https://fcc.gov/b",
                "FCC spectrum decision.", now - timedelta(hours=2),
            )))
        if host == "www.justice.gov":
            return httpx.Response(200, text=_rss(_rss_item(
                "DOJ files antitrust suit", "https://justice.gov/c",
                "DOJ antitrust action.", now - timedelta(hours=3),
            )))
        return httpx.Response(404)

    async def handler(request: httpx.Request) -> httpx.Response:
        return handler_for(request)

    _patch_transport(monkeypatch, handler)

    releases = await fetch_recent_releases(since_hours=6)
    sources = sorted(r.source for r in releases)
    assert sources == ["DOJ", "FCC", "FTC"]
    for r in releases:
        assert r.provider == "regulator"
        assert r.provider_kind == "regulator"
        assert r.is_primary is True
    ftc = next(r for r in releases if r.source == "FTC")
    assert ftc.title == "FTC sues over data practices"
    assert ftc.url == "https://ftc.gov/a"
    fcc = next(r for r in releases if r.source == "FCC")
    assert fcc.title == "FCC adopts spectrum order"
    assert fcc.url == "https://fcc.gov/b"


@pytest.mark.asyncio
async def test_dead_feed_does_not_kill_the_other_two(monkeypatch):
    now = datetime.now(timezone.utc)

    async def handler(request: httpx.Request) -> httpx.Response:
        host = request.url.host
        if host == "www.fcc.gov":
            # FCC feed is dead — 404. Must NOT abort FTC and DOJ.
            return httpx.Response(404, text="not found")
        if host == "www.ftc.gov":
            return httpx.Response(200, text=_rss(_rss_item(
                "FTC release", "https://ftc.gov/a", "FTC.",
                now - timedelta(hours=1),
            )))
        if host == "www.justice.gov":
            return httpx.Response(200, text=_rss(_rss_item(
                "DOJ release", "https://justice.gov/c", "DOJ.",
                now - timedelta(hours=2),
            )))
        return httpx.Response(404)

    _patch_transport(monkeypatch, handler)

    releases = await fetch_recent_releases(since_hours=6)
    sources = sorted(r.source for r in releases)
    # FCC dropped out, FTC + DOJ survived.
    assert sources == ["DOJ", "FTC"]


@pytest.mark.asyncio
async def test_malformed_xml_feed_is_a_noop(monkeypatch):
    now = datetime.now(timezone.utc)

    async def handler(request: httpx.Request) -> httpx.Response:
        host = request.url.host
        if host == "www.justice.gov":
            return httpx.Response(200, text="<not-valid-xml><<<")
        if host == "www.ftc.gov":
            return httpx.Response(200, text=_rss(_rss_item(
                "FTC release", "https://ftc.gov/a", "FTC.",
                now - timedelta(hours=1),
            )))
        return httpx.Response(404)

    _patch_transport(monkeypatch, handler)

    releases = await fetch_recent_releases(since_hours=6)
    # DOJ malformed, FCC 404 — only FTC survives, no exception raised.
    assert [r.source for r in releases] == ["FTC"]


@pytest.mark.asyncio
async def test_since_hours_filter_drops_stale_items(monkeypatch):
    now = datetime.now(timezone.utc)

    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "www.ftc.gov":
            return httpx.Response(200, text=_rss("\n".join([
                _rss_item("Fresh FTC", "https://ftc.gov/fresh", "Fresh.",
                          now - timedelta(hours=1)),
                _rss_item("Stale FTC", "https://ftc.gov/stale", "Stale.",
                          now - timedelta(hours=48)),
            ])))
        return httpx.Response(404)

    _patch_transport(monkeypatch, handler)

    releases = await fetch_recent_releases(since_hours=6)
    assert len(releases) == 1
    assert releases[0].title == "Fresh FTC"


@pytest.mark.asyncio
async def test_all_feeds_dead_returns_empty_list(monkeypatch):
    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, text="unavailable")

    _patch_transport(monkeypatch, handler)

    releases = await fetch_recent_releases(since_hours=6)
    assert releases == []
