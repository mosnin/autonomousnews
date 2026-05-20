"""Regulator press-release client — FTC / FCC / DOJ.

Enforcement actions, settlements, and merger challenges are announced in an
agency press release before any wire rewrite. Trends from here are flagged
``is_primary=True``.

Three public feeds, fetched in parallel and merged:
  FTC — RSS 2.0  press-release feed
  FCC — RSS/Atom headlines feed
  DOJ — RSS press-release feed

Each feed is fetched independently and fault-isolated: one feed timing out,
404-ing, or returning malformed XML produces an empty contribution and never
affects the other two (mirrors the per-source isolation in ``pipeline.py``).

Feed-URL verification (these government feed URLs drift — re-verify if a
feed silently returns nothing):
  FTC  https://www.ftc.gov/feeds/press-release.xml          — verified live
  FCC  https://www.fcc.gov/news-events/headlines.xml         — see _FCC_FEED
  DOJ  https://www.justice.gov/news/rss?type=press_release   — see _DOJ_FEED
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from xml.etree import ElementTree as ET

import httpx

from ._models import Trend

# FTC: standard RSS 2.0 press-release feed. Verified live during development.
_FTC_FEED = "https://www.ftc.gov/feeds/press-release.xml"

# FCC: the news headlines feed. The FCC periodically relocates this; if it
# starts returning a 503/404, this client treats it as a no-op rather than
# failing the module. Re-verify against
# https://www.fcc.gov/news-events/rss-feeds-and-email-updates-fcc
# TODO: feed URL — confirm this resolves from the production network; the
# FCC edge intermittently 503s automated clients.
_FCC_FEED = "https://www.fcc.gov/news-events/headlines.xml"

# DOJ: the news RSS endpoint, filtered to press releases via ?type=. DOJ's
# Drupal site exposes feeds under /news/rss; the URL has drifted before.
# TODO: feed URL — confirm this resolves from the production network; the
# justice.gov edge intermittently blocks automated clients (HTTP 401).
_DOJ_FEED = "https://www.justice.gov/news/rss?type=press_release"

_FEEDS: tuple[tuple[str, str], ...] = (
    ("FTC", _FTC_FEED),
    ("FCC", _FCC_FEED),
    ("DOJ", _DOJ_FEED),
)

# Government feeds block generic/library user agents; present a descriptive
# browser-like UA the way the SEC client presents a descriptive contact UA.
_USER_AGENT = (
    "Mozilla/5.0 (compatible; Techno Times agents; agents@technotimes.com)"
)

_ATOM_NS = "{http://www.w3.org/2005/Atom}"


def _parse_dt(value: str | None) -> datetime | None:
    """Parse an RSS (RFC-822) or Atom (ISO-8601) timestamp to aware UTC."""
    if not value:
        return None
    raw = value.strip()
    if not raw:
        return None
    # RSS feeds use RFC-822 dates ("Mon, 19 May 2026 14:00:00 -0400").
    try:
        dt = parsedate_to_datetime(raw)
        if dt is not None:
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
    except (TypeError, ValueError):
        pass
    # Atom feeds use ISO-8601 ("2026-05-19T14:00:00Z").
    try:
        iso = raw[:-1] + "+00:00" if raw.endswith("Z") else raw
        dt = datetime.fromisoformat(iso)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _strip_ns(tag: str) -> str:
    """Local tag name without its XML namespace prefix."""
    return tag.rsplit("}", 1)[-1]


def _parse_feed(source: str, body: str, cutoff: datetime) -> list[Trend]:
    """Parse one feed body (RSS or Atom) into Trend records within the window."""
    try:
        root = ET.fromstring(body)
    except ET.ParseError:
        return []

    out: list[Trend] = []

    # RSS: <rss><channel><item>...  Atom: <feed><entry>...
    items = list(root.iter("item"))
    is_atom = False
    if not items:
        items = list(root.iter(f"{_ATOM_NS}entry"))
        is_atom = True

    for item in items:
        title = ""
        url: str | None = None
        description: str | None = None
        published: datetime | None = None

        for child in item:
            name = _strip_ns(child.tag)
            text = (child.text or "").strip()
            if name == "title" and text:
                title = text
            elif name == "link":
                if is_atom:
                    href = child.get("href")
                    # Atom: prefer the alternate link, else first link href.
                    if href and (child.get("rel") in (None, "alternate")):
                        url = href
                elif text:
                    url = text
            elif name in ("description", "summary") and text:
                description = text
            elif name in ("pubDate", "published", "updated") and text:
                # Don't let <updated> overwrite a real <published>.
                if published is None or name != "updated":
                    published = _parse_dt(text)

        if not title:
            continue
        if published is None or published < cutoff:
            continue

        published_at = published.isoformat().replace("+00:00", "Z")
        out.append(Trend(
            title=title,
            description=description or f"{source} press release.",
            url=url,
            image_url=None,
            source=source,
            provider="regulator",
            published_at=published_at,
            raw={
                "agency": source,
                "title": title,
                "published": published_at,
            },
            author=None,
            provider_kind="regulator",
            is_primary=True,
        ))

    return out


async def _fetch_one(
    client: httpx.AsyncClient, source: str, url: str, cutoff: datetime
) -> list[Trend]:
    """Fetch and parse a single regulator feed. Fault-isolated: any failure
    (HTTP error, timeout, malformed XML, dead URL) yields an empty list so a
    single dead feed never kills the other two."""
    try:
        r = await client.get(
            url,
            headers={
                "User-Agent": _USER_AGENT,
                "Accept": "application/rss+xml, application/xml, text/xml",
            },
        )
        r.raise_for_status()
        return _parse_feed(source, r.text, cutoff)
    except Exception:
        # Swallow per-feed failures — a dead/blocked feed is a no-op, not a
        # module-wide failure. The pipeline-level wrapper logs source totals.
        return []


async def fetch_recent_releases(since_hours: int = 6) -> list[Trend]:
    """Fetch FTC / FCC / DOJ press releases published within the last
    ``since_hours`` hours, merged across all three feeds."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=since_hours)

    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        results = await asyncio.gather(
            *(
                _fetch_one(client, source, url, cutoff)
                for source, url in _FEEDS
            )
        )

    out: list[Trend] = []
    for chunk in results:
        out.extend(chunk)
    return out
