"""Federal Register client — primary-source U.S. rules and notices.

Every U.S. federal rule, proposed rule, and public notice is published in
the Federal Register. The document is the primary record — it lands here
before any trade-press write-up. Trends from here are flagged
``is_primary=True``.

The Federal Register API is free and unauthenticated. We query the
documents endpoint, filtered to the handful of agencies a technology
newsroom cares about (telecom, competition, standards, export controls,
copyright, spectrum policy).
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

import httpx

from ._models import Trend

FEDERAL_REGISTER_API_URL = (
    "https://www.federalregister.gov/api/v1/documents.json"
)

# Agency slugs (the Federal Register's stable identifiers) for the bodies
# whose rulemaking is tech news: telecom regulator, competition regulator,
# the standards body, the export-control bureau, the copyright office, and
# the spectrum/telecom-policy office.
FEDERAL_REGISTER_AGENCIES: tuple[str, ...] = (
    "federal-communications-commission",
    "federal-trade-commission",
    "national-institute-of-standards-and-technology",
    "industry-and-security-bureau",  # BIS — export controls
    "copyright-office-library-of-congress",  # U.S. Copyright Office
    "national-telecommunications-and-information-administration",
)

# Document types worth a story. The API returns title-cased values:
#   "Rule" = final rule, "Proposed Rule" = NPRM, "Notice" = public notice.
NEWSWORTHY_TYPES: frozenset[str] = frozenset({
    "Rule", "Proposed Rule", "Notice",
})

# Cap the result set — a day of tech-agency rulemaking is well under this.
_PER_PAGE = 50


def _parse_date(value: str | None) -> datetime | None:
    """Parse a Federal Register ``YYYY-MM-DD`` date to aware UTC midnight."""
    if not value:
        return None
    try:
        d = date.fromisoformat(value.strip()[:10])
    except ValueError:
        return None
    return datetime(d.year, d.month, d.day, tzinfo=timezone.utc)


def _primary_agency(doc: dict) -> str:
    """Human-readable name of the document's first agency, for ``source``."""
    for agency in doc.get("agencies") or []:
        if isinstance(agency, dict):
            name = (agency.get("name") or agency.get("raw_name") or "").strip()
            if name:
                return name
    return "Federal Register"


async def fetch_recent_documents(since_days: int = 1) -> list[Trend]:
    """Fetch Federal Register documents published within the last
    ``since_days`` days from the tracked tech-relevant agencies."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=since_days)).date()

    # httpx encodes a list value as repeated ``key=`` params, which is exactly
    # the ``conditions[agencies][]=a&conditions[agencies][]=b`` shape the API
    # wants. ``fields[]`` likewise trims the payload to what we parse.
    params: list[tuple[str, str]] = [
        ("per_page", str(_PER_PAGE)),
        ("order", "newest"),
        ("conditions[publication_date][gte]", cutoff.isoformat()),
    ]
    for slug in FEDERAL_REGISTER_AGENCIES:
        params.append(("conditions[agencies][]", slug))
    for field in (
        "title", "abstract", "type", "html_url",
        "publication_date", "agencies", "document_number",
    ):
        params.append(("fields[]", field))

    async with httpx.AsyncClient(timeout=25, follow_redirects=True) as client:
        r = await client.get(FEDERAL_REGISTER_API_URL, params=params)
        r.raise_for_status()
        try:
            payload = r.json()
        except ValueError:
            return []

    results = payload.get("results")
    if not isinstance(results, list):
        return []

    out: list[Trend] = []
    for doc in results:
        if not isinstance(doc, dict):
            continue
        title = (doc.get("title") or "").strip()
        if not title:
            continue

        doc_type = (doc.get("type") or "").strip()
        if doc_type and doc_type not in NEWSWORTHY_TYPES:
            continue

        published = _parse_date(doc.get("publication_date"))
        if published is None or published.date() < cutoff:
            continue

        agency = _primary_agency(doc)
        abstract = (doc.get("abstract") or "").strip()
        url = (doc.get("html_url") or "").strip() or None
        published_at = published.isoformat().replace("+00:00", "Z")

        out.append(Trend(
            title=title,
            description=abstract or (
                f"{agency} published a {doc_type or 'document'} in the "
                f"Federal Register."
            ),
            url=url,
            image_url=None,
            source=agency,
            provider="federal-register",
            published_at=published_at,
            raw={
                "title": title,
                "abstract": abstract,
                "type": doc_type,
                "agency": agency,
                "document_number": doc.get("document_number"),
                "publication_date": published_at,
            },
            author=None,
            provider_kind="federal-register",
            is_primary=True,
        ))

    return out
