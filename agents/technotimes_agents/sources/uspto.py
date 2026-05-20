"""USPTO client — primary-source granted patents.

A granted patent is a primary record: it exists the moment the USPTO
publishes it, well before a trade-press write-up. Trends from here are
flagged ``is_primary=True``.

We query the PatentsView PatentSearch API — the USPTO's official patent
search service (``https://search.patentsview.org/api/v1/patent/``). It
takes a JSON query in a POST body and returns JSON. PatentsView works
unauthenticated at a low rate limit; if a ``PATENTSVIEW_API_KEY`` (or the
``USPTO_API_KEY`` alias) env var is set we send it as ``X-Api-Key`` for the
higher quota. A rate-limit / auth / network failure is a graceful no-op —
this client is fault-isolated and never sinks the pipeline run.

The result set is filtered to tech-relevant CPC classifications:
  G06   computing
  H04   digital communication
  G06N  AI / machine learning specifically
"""
from __future__ import annotations

import os
from datetime import date, datetime, timedelta, timezone

import httpx

from ._models import Trend

PATENTSVIEW_API_URL = "https://search.patentsview.org/api/v1/patent/"

# CPC classification prefixes a technology newsroom cares about. PatentsView
# stores the CPC group/subclass on each patent; we match the leading prefix.
#   G06  = computing,  H04 = digital communication,  G06N = AI / ML.
USPTO_CPC_PREFIXES: tuple[str, ...] = ("G06", "H04", "G06N")

# Cap the result set — 30 grants per run is plenty of signal.
_MAX_RESULTS = 30


def _api_key() -> str | None:
    """Optional API key. ``PATENTSVIEW_API_KEY`` preferred, ``USPTO_API_KEY``
    accepted as an alias. Unset is fine — the API works key-free."""
    key = os.environ.get("PATENTSVIEW_API_KEY") or os.environ.get(
        "USPTO_API_KEY"
    )
    return key.strip() if key and key.strip() else None


def _parse_date(value: str | None) -> datetime | None:
    """Parse a PatentsView ``YYYY-MM-DD`` patent date to aware UTC midnight."""
    if not value:
        return None
    raw = value.strip()
    try:
        d = date.fromisoformat(raw[:10])
    except ValueError:
        return None
    return datetime(d.year, d.month, d.day, tzinfo=timezone.utc)


def _patent_url(patent_id: str) -> str:
    """Canonical USPTO full-text URL for a granted patent."""
    return f"https://patents.google.com/patent/US{patent_id}"


def _cpc_groups(patent: dict) -> list[str]:
    """All CPC group ids on a patent (e.g. 'G06N', 'H04L'). PatentsView nests
    these under ``cpc_current`` as a list of objects."""
    out: list[str] = []
    for entry in patent.get("cpc_current") or []:
        if not isinstance(entry, dict):
            continue
        group = (
            entry.get("cpc_group_id")
            or entry.get("cpc_subclass_id")
            or entry.get("cpc_class_id")
            or ""
        )
        group = str(group).strip()
        if group:
            out.append(group)
    return out


def _is_tech_relevant(groups: list[str]) -> bool:
    """True when any CPC group on the patent starts with a tracked prefix."""
    for g in groups:
        for prefix in USPTO_CPC_PREFIXES:
            if g.upper().startswith(prefix):
                return True
    return False


async def fetch_recent_grants(since_days: int = 1) -> list[Trend]:
    """Fetch patents granted within the last ``since_days`` days, filtered to
    the tech-relevant CPC classifications in ``USPTO_CPC_PREFIXES``."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=since_days)).date()

    # PatentsView query language: granted on/after the cutoff AND in one of
    # our CPC subclasses. ``_text_any`` matches the leading CPC token.
    query = {
        "_and": [
            {"_gte": {"patent_date": cutoff.isoformat()}},
            {
                "_or": [
                    {"_text_phrase": {"cpc_current.cpc_subclass_id": p}}
                    for p in USPTO_CPC_PREFIXES
                ]
            },
        ]
    }
    body = {
        "q": query,
        "f": [
            "patent_id",
            "patent_title",
            "patent_abstract",
            "patent_date",
            "cpc_current.cpc_group_id",
            "cpc_current.cpc_subclass_id",
            "cpc_current.cpc_class_id",
            "assignees.assignee_organization",
        ],
        "s": [{"patent_date": "desc"}],
        "o": {"size": _MAX_RESULTS},
    }

    headers = {"Accept": "application/json"}
    key = _api_key()
    if key:
        headers["X-Api-Key"] = key

    async with httpx.AsyncClient(timeout=25, follow_redirects=True) as client:
        r = await client.post(PATENTSVIEW_API_URL, json=body, headers=headers)
        r.raise_for_status()
        try:
            payload = r.json()
        except ValueError:
            return []

    patents = payload.get("patents")
    if not isinstance(patents, list):
        return []

    out: list[Trend] = []
    for patent in patents:
        if not isinstance(patent, dict):
            continue
        patent_id = str(patent.get("patent_id") or "").strip()
        title = (patent.get("patent_title") or "").strip()
        if not patent_id or not title:
            continue

        groups = _cpc_groups(patent)
        # Defensive: the API filter should already exclude off-topic patents,
        # but re-check locally so a loose query never widens our scope.
        if groups and not _is_tech_relevant(groups):
            continue

        granted = _parse_date(patent.get("patent_date"))
        if granted is None or granted.date() < cutoff:
            continue

        abstract = (patent.get("patent_abstract") or "").strip()

        assignees: list[str] = []
        for a in patent.get("assignees") or []:
            if isinstance(a, dict):
                org = (a.get("assignee_organization") or "").strip()
                if org:
                    assignees.append(org)

        published_at = granted.isoformat().replace("+00:00", "Z")

        out.append(Trend(
            title=title,
            description=abstract or (
                f"U.S. patent {patent_id} was granted by the USPTO"
                + (f" to {assignees[0]}." if assignees else ".")
            ),
            url=_patent_url(patent_id),
            image_url=None,
            source="USPTO",
            provider="uspto",
            published_at=published_at,
            raw={
                "patent_id": patent_id,
                "title": title,
                "abstract": abstract,
                "cpc_groups": groups,
                "assignees": assignees,
                "granted_date": published_at,
            },
            author=", ".join(assignees) if assignees else None,
            provider_kind="uspto",
            is_primary=True,
        ))

    return out
