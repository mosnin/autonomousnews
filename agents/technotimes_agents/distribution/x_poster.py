"""X (Twitter) auto-poster.

Posts every published article to X via the v2 `/2/tweets` endpoint using an
OAuth2 bearer token. When `X_BEARER_TOKEN` is unset the poster logs an info
line and skips silently — distribution must never crash a pipeline run.
"""
from __future__ import annotations

import asyncio
import os
import random
from typing import Any

import httpx

from ..api_client import LogBuffer

X_TWEETS_URL = "https://api.twitter.com/2/tweets"
TWEET_MAX_CHARS = 280
# Twitter wraps every URL in a t.co shortlink of fixed length. We budget for
# the canonical 23-char t.co length so a long article URL never blows past
# the character limit after Twitter rewrites it.
SITE_BASE = "https://technotimes.com"


def _first_sentence(text: str) -> str:
    """Return the first sentence of `text`, trimmed.

    Splits on the first sentence-ending punctuation followed by whitespace
    (or end of string). Falls back to the whole string if no boundary is
    found.
    """
    text = (text or "").strip()
    if not text:
        return ""
    for i, ch in enumerate(text):
        if ch in ".!?":
            # Boundary only when followed by space/end — avoids splitting
            # on decimals ("3.5") or abbreviations mid-word.
            rest = text[i + 1 :]
            if not rest or rest[0].isspace():
                return text[: i + 1].strip()
    return text


def build_tweet_text(article: dict[str, Any]) -> str:
    """Compose the tweet body and hard-truncate the whole thing at 280 chars.

    Layout is title / one-sentence dek summary / URL on separate lines. If
    the assembled text exceeds 280 chars we truncate the *whole* string
    (URL included) rather than dropping the link — the spec requires a
    hard 280-char cap on the final output.
    """
    title = (article.get("title") or "").strip()
    dek = _first_sentence(article.get("dek") or "")
    category = (article.get("category_slug") or "").strip("/")
    slug = (article.get("slug") or "").strip("/")
    url = f"{SITE_BASE}/{category}/{slug}"

    parts = [p for p in (title, dek, url) if p]
    text = "\n\n".join(parts)
    if len(text) > TWEET_MAX_CHARS:
        text = text[:TWEET_MAX_CHARS]
    return text


async def post_to_x(article: dict[str, Any], log: LogBuffer) -> dict | None:
    """Post a published article to X.

    Returns the parsed API response on success, or None when skipped /
    failed. Never raises — a failed channel must not break the run.
    """
    token = os.environ.get("X_BEARER_TOKEN")
    if not token:
        await log.info("x_poster skipped — X_BEARER_TOKEN unset")
        return None

    text = build_tweet_text(article)

    # 250ms jitter so a fan-out of several articles doesn't hit the API in a
    # tight synchronized burst.
    await asyncio.sleep(0.25 * random.random())

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                X_TWEETS_URL,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json={"text": text},
            )
        if r.status_code >= 400:
            await log.warn(
                "x_poster post failed",
                status=r.status_code,
                body=r.text[:300],
                title=article.get("title"),
            )
            return None
        data = r.json()
        await log.info(
            "posted to X",
            tweet_id=(data.get("data") or {}).get("id"),
            chars=len(text),
        )
        return data
    except Exception as e:  # pragma: no cover — never let a channel crash a run
        await log.warn("x_poster error", error=str(e), title=article.get("title"))
        return None
