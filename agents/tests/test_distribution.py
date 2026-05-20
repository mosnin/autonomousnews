"""Tests for the distribution channels (phase 11).

Covered:
  - X tweet text composition + hard 280-char truncation
  - Slack Block Kit payload shape
  - Discord embed payload shape
  - Silent no-op when channel env vars are unset
  - Daily digest HTML composition + bcc recipient batching
"""
from __future__ import annotations

import httpx
import pytest

from technotimes_agents.config import Config
from technotimes_agents.distribution import digest as digest_mod
from technotimes_agents.distribution.webhooks import (
    build_discord_payload,
    build_slack_payload,
    post_to_discord,
    post_to_slack,
)
from technotimes_agents.distribution.x_poster import build_tweet_text, post_to_x


# ---------------------------------------------------------------------------
# Test doubles
# ---------------------------------------------------------------------------
class FakeLog:
    """Minimal LogBuffer stand-in — records (level, message) pairs."""

    def __init__(self) -> None:
        self.entries: list[tuple[str, str]] = []

    async def info(self, message: str, **md) -> None:
        self.entries.append(("info", message))

    async def warn(self, message: str, **md) -> None:
        self.entries.append(("warn", message))

    async def error(self, message: str, **md) -> None:
        self.entries.append(("error", message))


def _patch_httpx(monkeypatch, handler):
    """Swap httpx.AsyncClient so any instance routes through `handler`."""
    real = httpx.AsyncClient

    def factory(*args, **kwargs):
        kwargs.pop("timeout", None)
        kwargs.pop("headers", None)
        kwargs.pop("base_url", None)
        return real(transport=httpx.MockTransport(handler), **kwargs)

    monkeypatch.setattr(httpx, "AsyncClient", factory)


ARTICLE = {
    "title": "Major Chipmaker Unveils New AI Accelerator",
    "dek": "The launch reshapes the data-center market. A second sentence here.",
    "category_slug": "technology",
    "slug": "ai-accelerator-launch",
    "cover_image_url": "https://cdn.example.com/cover.jpg",
}


# ---------------------------------------------------------------------------
# X tweet text
# ---------------------------------------------------------------------------
class TestTweetText:
    def test_includes_title_summary_and_url(self):
        text = build_tweet_text(ARTICLE)
        assert "Major Chipmaker Unveils New AI Accelerator" in text
        assert "https://technotimes.com/technology/ai-accelerator-launch" in text

    def test_uses_only_first_sentence_of_dek(self):
        text = build_tweet_text(ARTICLE)
        assert "The launch reshapes the data-center market." in text
        assert "A second sentence here" not in text

    def test_hard_truncates_at_280_chars(self):
        long = {
            "title": "T " * 200,
            "dek": "D " * 200 + ".",
            "category_slug": "technology",
            "slug": "x",
            "cover_image_url": None,
        }
        text = build_tweet_text(long)
        assert len(text) == 280

    def test_short_article_is_not_truncated(self):
        text = build_tweet_text(ARTICLE)
        assert len(text) < 280


@pytest.mark.asyncio
async def test_post_to_x_skips_silently_when_token_unset(monkeypatch):
    monkeypatch.delenv("X_BEARER_TOKEN", raising=False)
    log = FakeLog()
    result = await post_to_x(ARTICLE, log)
    assert result is None
    assert any(lvl == "info" for lvl, _ in log.entries)
    assert all(lvl != "error" for lvl, _ in log.entries)


@pytest.mark.asyncio
async def test_post_to_x_posts_when_token_set(monkeypatch):
    monkeypatch.setenv("X_BEARER_TOKEN", "tok-123")
    captured: dict = {}

    async def handler(req: httpx.Request) -> httpx.Response:
        captured["url"] = str(req.url)
        captured["auth"] = req.headers.get("authorization")
        import json as _json

        captured["body"] = _json.loads(req.content)
        return httpx.Response(201, json={"data": {"id": "999"}})

    _patch_httpx(monkeypatch, handler)
    log = FakeLog()
    result = await post_to_x(ARTICLE, log)
    assert result == {"data": {"id": "999"}}
    assert captured["url"] == "https://api.twitter.com/2/tweets"
    assert captured["auth"] == "Bearer tok-123"
    assert len(captured["body"]["text"]) <= 280


@pytest.mark.asyncio
async def test_post_to_x_swallows_api_error(monkeypatch):
    monkeypatch.setenv("X_BEARER_TOKEN", "tok-123")

    async def handler(req: httpx.Request) -> httpx.Response:
        return httpx.Response(403, json={"error": "forbidden"})

    _patch_httpx(monkeypatch, handler)
    log = FakeLog()
    result = await post_to_x(ARTICLE, log)
    assert result is None
    assert any(lvl == "warn" for lvl, _ in log.entries)


# ---------------------------------------------------------------------------
# Slack / Discord payload shapes
# ---------------------------------------------------------------------------
class TestSlackPayload:
    def test_has_blocks_and_fallback_text(self):
        p = build_slack_payload(ARTICLE)
        assert "blocks" in p and isinstance(p["blocks"], list)
        assert "text" in p and ARTICLE["title"] in p["text"]

    def test_header_and_section_blocks(self):
        p = build_slack_payload(ARTICLE)
        types = [b["type"] for b in p["blocks"]]
        assert types[0] == "header"
        assert "section" in types

    def test_section_carries_link_and_image(self):
        p = build_slack_payload(ARTICLE)
        section = next(b for b in p["blocks"] if b["type"] == "section")
        assert "technotimes.com/technology/ai-accelerator-launch" in section[
            "text"
        ]["text"]
        assert section["accessory"]["image_url"] == ARTICLE["cover_image_url"]

    def test_no_image_accessory_when_cover_missing(self):
        p = build_slack_payload({**ARTICLE, "cover_image_url": None})
        section = next(b for b in p["blocks"] if b["type"] == "section")
        assert "accessory" not in section


class TestDiscordPayload:
    def test_has_single_embed(self):
        p = build_discord_payload(ARTICLE)
        assert isinstance(p["embeds"], list) and len(p["embeds"]) == 1

    def test_embed_carries_title_url_description_image(self):
        embed = build_discord_payload(ARTICLE)["embeds"][0]
        assert embed["title"] == ARTICLE["title"]
        assert embed["url"] == "https://technotimes.com/technology/ai-accelerator-launch"
        assert embed["description"] == ARTICLE["dek"]
        assert embed["image"]["url"] == ARTICLE["cover_image_url"]

    def test_no_image_key_when_cover_missing(self):
        embed = build_discord_payload({**ARTICLE, "cover_image_url": None})[
            "embeds"
        ][0]
        assert "image" not in embed


@pytest.mark.asyncio
async def test_slack_skips_silently_when_unset(monkeypatch):
    monkeypatch.delenv("SLACK_WEBHOOK_URL", raising=False)
    log = FakeLog()
    assert await post_to_slack(ARTICLE, log) is None
    assert all(lvl != "error" for lvl, _ in log.entries)


@pytest.mark.asyncio
async def test_discord_skips_silently_when_unset(monkeypatch):
    monkeypatch.delenv("DISCORD_WEBHOOK_URL", raising=False)
    log = FakeLog()
    assert await post_to_discord(ARTICLE, log) is None
    assert all(lvl != "error" for lvl, _ in log.entries)


@pytest.mark.asyncio
async def test_slack_posts_when_configured(monkeypatch):
    monkeypatch.setenv("SLACK_WEBHOOK_URL", "https://hooks.slack.com/x")
    seen: dict = {}

    async def handler(req: httpx.Request) -> httpx.Response:
        import json as _json

        seen["url"] = str(req.url)
        seen["body"] = _json.loads(req.content)
        return httpx.Response(200, text="ok")

    _patch_httpx(monkeypatch, handler)
    log = FakeLog()
    result = await post_to_slack(ARTICLE, log)
    assert result == {"status": 200}
    assert seen["url"] == "https://hooks.slack.com/x"
    assert "blocks" in seen["body"]


@pytest.mark.asyncio
async def test_discord_posts_when_configured(monkeypatch):
    monkeypatch.setenv("DISCORD_WEBHOOK_URL", "https://discord.com/api/webhooks/x")
    seen: dict = {}

    async def handler(req: httpx.Request) -> httpx.Response:
        import json as _json

        seen["body"] = _json.loads(req.content)
        return httpx.Response(204)

    _patch_httpx(monkeypatch, handler)
    log = FakeLog()
    result = await post_to_discord(ARTICLE, log)
    assert result == {"status": 204}
    assert "embeds" in seen["body"]


# ---------------------------------------------------------------------------
# Daily digest
# ---------------------------------------------------------------------------
DIGEST_ARTICLES = [
    {
        "title": f"Story {i}",
        "dek": f"Dek for story {i}.",
        "category_slug": "world",
        "slug": f"story-{i}",
    }
    for i in range(3)
]


def _digest_cfg() -> Config:
    return Config(
        site_url="https://technotimes.com",
        admin_api_key="adminkey",
        openai_api_key="x",
        newsapi_key=None,
        thenewsapi_token=None,
        daily_budget_usd=10.0,
        editor_model="gpt-4o-mini",
        writer_model="gpt-4o-mini",
        image_model="dall-e-3",
        pillar_model="gpt-5-mini",
        checker_model="gpt-5-mini",
        articles_per_run_min=2,
        articles_per_run_max=3,
        evergreen_ratio=0.3,
    )


class TestDigestHtml:
    def test_renders_table_with_every_article(self):
        html = digest_mod.render_digest_html(
            "https://technotimes.com", DIGEST_ARTICLES
        )
        assert "<table" in html
        for a in DIGEST_ARTICLES:
            assert a["title"] in html
            assert f"/world/{a['slug']}" in html

    def test_escapes_html_in_titles(self):
        html = digest_mod.render_digest_html(
            "https://technotimes.com",
            [{"title": "<script>x</script>", "dek": "d", "category_slug": "c", "slug": "s"}],
        )
        assert "<script>x</script>" not in html
        assert "&lt;script&gt;" in html

    def test_empty_article_list_renders_placeholder(self):
        html = digest_mod.render_digest_html("https://technotimes.com", [])
        assert "No new stories" in html


class TestDigestBatching:
    def test_batches_recipients_in_groups_of_100(self):
        items = list(range(250))
        batches = digest_mod._batch(items, 100)
        assert [len(b) for b in batches] == [100, 100, 50]

    def test_single_batch_when_under_limit(self):
        batches = digest_mod._batch(list(range(40)), 100)
        assert len(batches) == 1


@pytest.mark.asyncio
async def test_digest_skips_when_resend_key_unset(monkeypatch):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)

    async def handler(req: httpx.Request) -> httpx.Response:
        if "recent-articles" in str(req.url):
            return httpx.Response(200, json={"articles": DIGEST_ARTICLES})
        if "subscribers" in str(req.url):
            return httpx.Response(
                200, json={"subscribers": ["a@x.com", "b@x.com"]}
            )
        raise AssertionError(f"unexpected request {req.url}")

    _patch_httpx(monkeypatch, handler)
    result = await digest_mod.send_daily_digest(_digest_cfg())
    assert result["status"] == "skipped"
    assert result["articles"] == 3
    assert result["subscribers"] == 2


@pytest.mark.asyncio
async def test_digest_sends_and_batches_recipients(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "re_test")
    subscribers = [f"user{i}@example.com" for i in range(230)]
    sends: list[dict] = []

    async def handler(req: httpx.Request) -> httpx.Response:
        url = str(req.url)
        if "recent-articles" in url:
            return httpx.Response(200, json={"articles": DIGEST_ARTICLES})
        if "subscribers" in url:
            return httpx.Response(200, json={"subscribers": subscribers})
        if "api.resend.com" in url:
            import json as _json

            sends.append(_json.loads(req.content))
            return httpx.Response(200, json={"id": "email-id"})
        raise AssertionError(f"unexpected request {url}")

    _patch_httpx(monkeypatch, handler)
    result = await digest_mod.send_daily_digest(_digest_cfg())
    assert result["status"] == "sent"
    assert result["batches"] == 3  # 100 + 100 + 30
    assert result["recipients_sent"] == 230
    # Every send uses bcc, From/subject set correctly.
    assert [len(s["bcc"]) for s in sends] == [100, 100, 30]
    assert all(s["from"] == "Techno Times <brief@technotimes.com>" for s in sends)
    assert all(s["subject"].startswith("Techno Times — ") for s in sends)


@pytest.mark.asyncio
async def test_digest_no_recipients(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "re_test")

    async def handler(req: httpx.Request) -> httpx.Response:
        if "recent-articles" in str(req.url):
            return httpx.Response(200, json={"articles": []})
        if "subscribers" in str(req.url):
            return httpx.Response(200, json={"subscribers": []})
        raise AssertionError("unexpected")

    _patch_httpx(monkeypatch, handler)
    result = await digest_mod.send_daily_digest(_digest_cfg())
    assert result["status"] == "no_recipients"
