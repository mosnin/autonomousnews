"""arXiv client — primary-source research papers.

arXiv is where research lands *first* — days to weeks before a press release
or a science-desk rewrite. Trends from here are flagged ``is_primary=True``.

The API returns an Atom feed; we query the four CS categories most relevant
to a technology newsroom, newest first.
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from xml.etree import ElementTree as ET

import httpx

from ._models import Trend

# CS categories a technology newsroom cares about:
#   cs.AI artificial intelligence, cs.CL computation & language (NLP/LLMs),
#   cs.CR cryptography & security, cs.DC distributed/parallel computing.
ARXIV_CATEGORIES: tuple[str, ...] = ("cs.AI", "cs.CL", "cs.CR", "cs.DC")

ARXIV_API_URL = "http://export.arxiv.org/api/query"

_ATOM_NS = "{http://www.w3.org/2005/Atom}"
_ARXIV_NS = "{http://arxiv.org/schemas/atom}"

# Collapse the runs of whitespace arXiv embeds in titles/abstracts.
_WS_RE = re.compile(r"\s+")


def _clean(text: str | None) -> str:
    if not text:
        return ""
    return _WS_RE.sub(" ", text).strip()


def _parse_dt(value: str | None) -> datetime | None:
    """Parse an arXiv Atom timestamp to an aware UTC datetime."""
    if not value:
        return None
    raw = value.strip()
    try:
        if raw.endswith("Z"):
            raw = raw[:-1] + "+00:00"
        dt = datetime.fromisoformat(raw)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _primary_category(entry: ET.Element) -> str | None:
    """Primary category: prefer arXiv's <arxiv:primary_category>, fall back
    to the first plain <category term="...">."""
    prim = entry.find(f"{_ARXIV_NS}primary_category")
    if prim is not None:
        term = (prim.get("term") or "").strip()
        if term:
            return term
    cat = entry.find(f"{_ATOM_NS}category")
    if cat is not None:
        term = (cat.get("term") or "").strip()
        if term:
            return term
    return None


async def fetch_recent_papers(since_minutes: int = 60) -> list[Trend]:
    """Fetch the newest arXiv papers in `ARXIV_CATEGORIES`, keeping only
    those submitted within the last ``since_minutes``."""
    search_query = " OR ".join(f"cat:{c}" for c in ARXIV_CATEGORIES)
    # The spec-mandated http:// endpoint 301s to https://; follow it.
    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        r = await client.get(
            ARXIV_API_URL,
            params={
                "search_query": search_query,
                "sortBy": "submittedDate",
                "sortOrder": "descending",
                "max_results": 50,
            },
        )
        r.raise_for_status()
        body = r.text

    try:
        root = ET.fromstring(body)
    except ET.ParseError:
        return []

    cutoff = datetime.now(timezone.utc) - timedelta(minutes=since_minutes)
    out: list[Trend] = []

    for entry in root.iter(f"{_ATOM_NS}entry"):
        title = _clean(
            entry.findtext(f"{_ATOM_NS}title")
        )
        if not title:
            continue

        published = _parse_dt(entry.findtext(f"{_ATOM_NS}published"))
        if published is None or published < cutoff:
            continue

        abstract = _clean(entry.findtext(f"{_ATOM_NS}summary"))
        category = _primary_category(entry)

        authors: list[str] = []
        for author_el in entry.findall(f"{_ATOM_NS}author"):
            name = _clean(author_el.findtext(f"{_ATOM_NS}name"))
            if name:
                authors.append(name)

        # <id> is the canonical abstract URL; prefer the alternate link if
        # arXiv tags one explicitly.
        url = _clean(entry.findtext(f"{_ATOM_NS}id")) or None
        for link in entry.findall(f"{_ATOM_NS}link"):
            if link.get("rel") == "alternate" and link.get("href"):
                url = link.get("href")
                break

        published_at = published.isoformat().replace("+00:00", "Z")
        byline = ", ".join(authors) if authors else None

        out.append(Trend(
            title=title,
            description=abstract or None,
            url=url,
            image_url=None,
            source="arXiv",
            provider="arxiv",
            published_at=published_at,
            raw={
                "title": title,
                "authors": authors,
                "abstract": abstract,
                "primary_category": category,
                "submitted_date": published_at,
                "url": url,
            },
            author=byline,
            provider_kind="arxiv",
            is_primary=True,
        ))

    return out
