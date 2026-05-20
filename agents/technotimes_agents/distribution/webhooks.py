"""Slack and Discord incoming-webhook posters.

Both channels read their webhook URL from the environment and POST a
formatted message when a new article is published. When the env var is
unset the poster is a silent no-op — distribution must never crash a run.
"""
from __future__ import annotations

import os
from typing import Any

import httpx

from ..api_client import LogBuffer

SITE_BASE = "https://technotimes.com"


def article_url(article: dict[str, Any]) -> str:
    category = (article.get("category_slug") or "").strip("/")
    slug = (article.get("slug") or "").strip("/")
    return f"{SITE_BASE}/{category}/{slug}"


def build_slack_payload(article: dict[str, Any]) -> dict[str, Any]:
    """Slack Block Kit payload: a header, the dek, and a link button."""
    title = (article.get("title") or "").strip()
    dek = (article.get("dek") or "").strip()
    url = article_url(article)
    cover = article.get("cover_image_url")

    section: dict[str, Any] = {
        "type": "section",
        "text": {"type": "mrkdwn", "text": f"*<{url}|{title}>*\n{dek}"},
    }
    if cover:
        section["accessory"] = {
            "type": "image",
            "image_url": cover,
            "alt_text": title or "cover image",
        }

    blocks: list[dict[str, Any]] = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": "New on Techno Times"},
        },
        section,
        {
            "type": "context",
            "elements": [{"type": "mrkdwn", "text": url}],
        },
    ]
    # `text` is the notification fallback shown in push alerts / older
    # clients that can't render blocks.
    return {"text": f"{title} — {url}", "blocks": blocks}


def build_discord_payload(article: dict[str, Any]) -> dict[str, Any]:
    """Discord webhook payload using a single rich embed."""
    title = (article.get("title") or "").strip()
    dek = (article.get("dek") or "").strip()
    url = article_url(article)
    cover = article.get("cover_image_url")

    embed: dict[str, Any] = {
        "title": title,
        "url": url,
        "description": dek,
        "color": 0x111111,
        "footer": {"text": "Techno Times"},
    }
    if cover:
        embed["image"] = {"url": cover}

    return {"content": f"New on Techno Times: {url}", "embeds": [embed]}


async def _post_webhook(
    url: str, payload: dict[str, Any], channel: str, log: LogBuffer, title: str | None
) -> dict | None:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(url, json=payload)
        if r.status_code >= 400:
            await log.warn(
                f"{channel} webhook failed",
                status=r.status_code,
                body=r.text[:300],
                title=title,
            )
            return None
        await log.info(f"posted to {channel}", title=title)
        return {"status": r.status_code}
    except Exception as e:  # pragma: no cover — never let a channel crash a run
        await log.warn(f"{channel} webhook error", error=str(e), title=title)
        return None


async def post_to_slack(article: dict[str, Any], log: LogBuffer) -> dict | None:
    """Post a published article to Slack. No-op if SLACK_WEBHOOK_URL unset."""
    url = os.environ.get("SLACK_WEBHOOK_URL")
    if not url:
        await log.info("slack poster skipped — SLACK_WEBHOOK_URL unset")
        return None
    return await _post_webhook(
        url, build_slack_payload(article), "slack", log, article.get("title")
    )


async def post_to_discord(article: dict[str, Any], log: LogBuffer) -> dict | None:
    """Post a published article to Discord. No-op if DISCORD_WEBHOOK_URL unset."""
    url = os.environ.get("DISCORD_WEBHOOK_URL")
    if not url:
        await log.info("discord poster skipped — DISCORD_WEBHOOK_URL unset")
        return None
    return await _post_webhook(
        url, build_discord_payload(article), "discord", log, article.get("title")
    )
