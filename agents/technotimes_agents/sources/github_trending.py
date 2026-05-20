"""GitHub trending client — primary-source open-source releases.

A repository that gains hundreds of stars within days is a primary signal
of a notable open-source release — it surfaces here before the trade press
writes it up. Trends from here are flagged ``is_primary=True``.

GitHub has no official "trending" API, so we approximate it with the
Search API: repositories created in the last N days, sorted by stars. A
``min_stars`` floor filters out the long tail of noise.

Auth: a ``GITHUB_TOKEN`` env var is used as a bearer token when present
(60 -> 30 search req/min). Unauthenticated works too, at ~10 search
req/min — a rate-limit hit (HTTP 403/429) is a graceful no-op.
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import httpx

from ._models import Trend

GITHUB_SEARCH_URL = "https://api.github.com/search/repositories"

# Cap the result set — 30 repos is plenty of signal for one run.
_PER_PAGE = 30

# Description preview length baked into the headline.
_DESC_PREVIEW = 80


def _token() -> str | None:
    """Optional GitHub token. Unset is fine — the Search API works key-free
    (just at a lower rate limit)."""
    token = os.environ.get("GITHUB_TOKEN")
    return token.strip() if token and token.strip() else None


def _parse_dt(value: str | None) -> datetime | None:
    """Parse a GitHub ISO-8601 timestamp to an aware UTC datetime."""
    if not value:
        return None
    raw = value.strip()
    try:
        iso = raw[:-1] + "+00:00" if raw.endswith("Z") else raw
        dt = datetime.fromisoformat(iso)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


async def fetch_trending_repos(
    since_days: int = 7, min_stars: int = 200
) -> list[Trend]:
    """Fetch high-velocity repositories created within the last
    ``since_days`` days, keeping only those above ``min_stars`` with a
    non-empty description."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=since_days)).date()

    params = {
        "q": f"created:>={cutoff.isoformat()}",
        "sort": "stars",
        "order": "desc",
        "per_page": _PER_PAGE,
    }
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "Techno Times agents",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    token = _token()
    if token:
        headers["Authorization"] = f"Bearer {token}"

    async with httpx.AsyncClient(timeout=25, follow_redirects=True) as client:
        r = await client.get(GITHUB_SEARCH_URL, params=params, headers=headers)
        # A 403/429 here is almost always the search rate limit. Treat it as
        # a graceful no-op rather than raising — this client is fault-isolated.
        if r.status_code in (403, 429):
            return []
        r.raise_for_status()
        try:
            payload = r.json()
        except ValueError:
            return []

    items = payload.get("items")
    if not isinstance(items, list):
        return []

    out: list[Trend] = []
    for repo in items:
        if not isinstance(repo, dict):
            continue

        full_name = (repo.get("full_name") or "").strip()
        description = (repo.get("description") or "").strip()
        # Signal threshold: skip the noisy long tail and anything undescribed.
        if not full_name or not description:
            continue

        stars = repo.get("stargazers_count")
        stars = stars if isinstance(stars, int) else 0
        if stars < min_stars:
            continue

        url = (repo.get("html_url") or "").strip() or None
        language = (repo.get("language") or "").strip() or None
        created = _parse_dt(repo.get("created_at"))
        published_at = (
            created.isoformat().replace("+00:00", "Z") if created else None
        )

        preview = description[:_DESC_PREVIEW].strip()
        title = f"{full_name}: {preview}"

        lang_part = f" Primary language: {language}." if language else ""
        full_description = (
            f"{description} {lang_part} {stars:,} stars on GitHub."
        ).strip()

        out.append(Trend(
            title=title,
            description=full_description,
            url=url,
            image_url=None,
            source="GitHub",
            provider="github",
            published_at=published_at,
            raw={
                "full_name": full_name,
                "description": description,
                "language": language,
                "stars": stars,
                "created_at": published_at,
                "url": url,
            },
            author=None,
            provider_kind="github",
            is_primary=True,
        ))

    return out
