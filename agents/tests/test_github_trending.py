"""Tests for the GitHub trending primary-source client."""
from __future__ import annotations

import json
from datetime import datetime, timezone

import httpx
import pytest

from technotimes_agents.sources import fetch_trending_repos


def _repo(
    full_name: str,
    description: str | None,
    stars: int,
    language: str | None = "Python",
) -> dict:
    return {
        "full_name": full_name,
        "description": description,
        "stargazers_count": stars,
        "language": language,
        "html_url": f"https://github.com/{full_name}",
        "created_at": datetime.now(timezone.utc)
        .isoformat()
        .replace("+00:00", "Z"),
    }


def _body(repos: list[dict]) -> str:
    return json.dumps({
        "total_count": len(repos),
        "incomplete_results": False,
        "items": repos,
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
async def test_parses_repo_fields(monkeypatch):
    body = _body([_repo(
        "acme/superllm",
        "A blazing-fast open-source large language model runtime",
        4200,
        language="Rust",
    )])

    captured = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        captured["host"] = request.url.host
        captured["q"] = request.url.params.get("q")
        captured["sort"] = request.url.params.get("sort")
        return httpx.Response(200, text=body)

    _patch_transport(monkeypatch, handler)

    repos = await fetch_trending_repos(since_days=7, min_stars=200)
    assert len(repos) == 1
    r = repos[0]
    assert r.title.startswith("acme/superllm: ")
    assert r.url == "https://github.com/acme/superllm"
    assert r.source == "GitHub"
    assert r.provider == "github"
    assert r.provider_kind == "github"
    assert r.is_primary is True
    assert r.raw["stars"] == 4200
    assert r.raw["language"] == "Rust"
    # Description carries language + star count.
    assert "Rust" in r.description
    assert "4,200 stars" in r.description
    assert captured["host"] == "api.github.com"
    assert captured["q"].startswith("created:>=")
    assert captured["sort"] == "stars"


@pytest.mark.asyncio
async def test_min_stars_filter(monkeypatch):
    body = _body([
        _repo("big/repo", "Above the threshold.", 900),
        _repo("small/repo", "Below the threshold.", 50),
    ])

    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=body)

    _patch_transport(monkeypatch, handler)

    repos = await fetch_trending_repos(since_days=7, min_stars=200)
    assert len(repos) == 1
    assert repos[0].raw["full_name"] == "big/repo"


@pytest.mark.asyncio
async def test_empty_description_repo_is_dropped(monkeypatch):
    body = _body([
        _repo("has/desc", "A described project.", 500),
        _repo("no/desc", None, 5000),
        _repo("blank/desc", "   ", 5000),
    ])

    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=body)

    _patch_transport(monkeypatch, handler)

    repos = await fetch_trending_repos(since_days=7, min_stars=200)
    assert len(repos) == 1
    assert repos[0].raw["full_name"] == "has/desc"


@pytest.mark.asyncio
async def test_token_used_as_bearer_when_set(monkeypatch):
    monkeypatch.setenv("GITHUB_TOKEN", "ghp_testtoken")
    captured = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        captured["auth"] = request.headers.get("Authorization")
        return httpx.Response(200, text=_body([]))

    _patch_transport(monkeypatch, handler)

    await fetch_trending_repos(since_days=7, min_stars=200)
    assert captured["auth"] == "Bearer ghp_testtoken"


@pytest.mark.asyncio
async def test_no_auth_header_when_token_unset(monkeypatch):
    monkeypatch.delenv("GITHUB_TOKEN", raising=False)
    captured = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        captured["auth"] = request.headers.get("Authorization")
        return httpx.Response(200, text=_body([]))

    _patch_transport(monkeypatch, handler)

    await fetch_trending_repos(since_days=7, min_stars=200)
    assert captured["auth"] is None


@pytest.mark.asyncio
async def test_rate_limit_is_graceful_noop(monkeypatch):
    async def handler(request: httpx.Request) -> httpx.Response:
        # The search rate limit returns 403 with a rate-limit body.
        return httpx.Response(403, text='{"message":"API rate limit exceeded"}')

    _patch_transport(monkeypatch, handler)

    repos = await fetch_trending_repos(since_days=7, min_stars=200)
    assert repos == []


@pytest.mark.asyncio
async def test_server_error_raises_for_pipeline_wrapper(monkeypatch):
    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, text="server error")

    _patch_transport(monkeypatch, handler)

    with pytest.raises(httpx.HTTPStatusError):
        await fetch_trending_repos(since_days=7, min_stars=200)
