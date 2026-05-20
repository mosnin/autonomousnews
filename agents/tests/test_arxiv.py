"""Tests for the arXiv primary-source client."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import httpx
import pytest

from technotimes_agents.sources import ARXIV_CATEGORIES, fetch_recent_papers


def _feed(entries: str) -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<feed xmlns="http://www.w3.org/2005/Atom" '
        'xmlns:arxiv="http://arxiv.org/schemas/atom">\n'
        "<title>arXiv query</title>\n"
        f"{entries}\n"
        "</feed>"
    )


def _entry(
    arxiv_id: str,
    title: str,
    authors: list[str],
    abstract: str,
    category: str,
    published: str,
) -> str:
    author_xml = "\n".join(
        f"  <author><name>{a}</name></author>" for a in authors
    )
    return (
        "<entry>\n"
        f"  <id>http://arxiv.org/abs/{arxiv_id}</id>\n"
        f"  <updated>{published}</updated>\n"
        f"  <published>{published}</published>\n"
        f"  <title>{title}</title>\n"
        f"  <summary>{abstract}</summary>\n"
        f"{author_xml}\n"
        f'  <link href="http://arxiv.org/abs/{arxiv_id}" '
        'rel="alternate" type="text/html"/>\n'
        f'  <arxiv:primary_category xmlns:arxiv='
        f'"http://arxiv.org/schemas/atom" term="{category}"/>\n'
        f'  <category term="{category}" '
        'scheme="http://arxiv.org/schemas/atom"/>\n'
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
async def test_parses_title_authors_abstract_and_category(monkeypatch):
    now = datetime.now(timezone.utc)
    body = _feed(_entry(
        arxiv_id="2505.12345",
        title="A Breakthrough in   Language Model\n  Reasoning",
        authors=["Ada Lovelace", "Alan Turing"],
        abstract="We present a novel approach to model reasoning.",
        category="cs.CL",
        published=now.isoformat().replace("+00:00", "Z"),
    ))

    captured = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        captured["host"] = request.url.host
        captured["search_query"] = request.url.params.get("search_query")
        return httpx.Response(200, text=body)

    _patch_transport(monkeypatch, handler)

    papers = await fetch_recent_papers(since_minutes=60)
    assert len(papers) == 1
    p = papers[0]
    # Whitespace runs in the title are collapsed.
    assert p.title == "A Breakthrough in Language Model Reasoning"
    assert p.raw["authors"] == ["Ada Lovelace", "Alan Turing"]
    assert p.author == "Ada Lovelace, Alan Turing"
    assert p.description == "We present a novel approach to model reasoning."
    assert p.raw["primary_category"] == "cs.CL"
    assert p.url == "http://arxiv.org/abs/2505.12345"
    assert p.provider == "arxiv"
    assert p.provider_kind == "arxiv"
    assert p.is_primary is True
    assert p.source == "arXiv"
    # The query must search exactly the four configured CS categories.
    assert captured["host"] == "export.arxiv.org"
    for cat in ARXIV_CATEGORIES:
        assert f"cat:{cat}" in captured["search_query"]


@pytest.mark.asyncio
async def test_date_filter_drops_old_papers(monkeypatch):
    now = datetime.now(timezone.utc)
    fresh = now - timedelta(minutes=20)
    old = now - timedelta(minutes=300)
    body = _feed("\n".join([
        _entry("2505.00001", "Fresh paper", ["Grace Hopper"],
               "Fresh abstract.", "cs.AI",
               fresh.isoformat().replace("+00:00", "Z")),
        _entry("2504.99999", "Stale paper", ["John von Neumann"],
               "Stale abstract.", "cs.DC",
               old.isoformat().replace("+00:00", "Z")),
    ]))

    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=body)

    _patch_transport(monkeypatch, handler)

    papers = await fetch_recent_papers(since_minutes=60)
    assert len(papers) == 1
    assert papers[0].title == "Fresh paper"
    assert papers[0].raw["primary_category"] == "cs.AI"


@pytest.mark.asyncio
async def test_empty_feed_returns_empty_list(monkeypatch):
    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=_feed(""))

    _patch_transport(monkeypatch, handler)

    papers = await fetch_recent_papers(since_minutes=60)
    assert papers == []


def test_arxiv_categories_are_the_four_cs_feeds():
    assert ARXIV_CATEGORIES == ("cs.AI", "cs.CL", "cs.CR", "cs.DC")
