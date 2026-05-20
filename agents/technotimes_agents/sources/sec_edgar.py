"""SEC EDGAR client — primary-source public-company filings.

EDGAR is *upstream* of every financial-news aggregator: an 8-K hits this
Atom feed the moment it is accepted, minutes before newsapi.org reflects a
wire rewrite of it. Trends from here are flagged ``is_primary=True``.

The feed is the "getcurrent" Atom view of recently accepted filings:
    https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=&output=atom

SEC requires a descriptive ``User-Agent`` (it blocks generic / library UAs).
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from xml.etree import ElementTree as ET

import httpx

from ._models import Trend

# SEC mandates a descriptive UA with a contact address; generic UAs are
# rate-limited / blocked outright.
SEC_USER_AGENT = "Techno Times agents@technotimes.com"

EDGAR_CURRENT_URL = (
    "https://www.sec.gov/cgi-bin/browse-edgar"
    "?action=getcurrent&type=&output=atom"
)

# Forms worth a story. 8-K = material event; S-1 = IPO registration;
# DEF 14A = proxy statement; 13D/13G = beneficial-ownership stakes.
NEWSWORTHY_FORMS: frozenset[str] = frozenset({
    "8-K", "S-1", "DEF 14A", "SC 13D", "SC 13G", "13D", "13G",
})

# CIKs of ~50 large tech companies. CIK is the SEC's stable issuer id and is
# zero-padding-insensitive; we normalize to int for matching. Sourced from
# the EDGAR company database. A filing from any other CIK is dropped.
TECH_CIKS: dict[int, str] = {
    320193: "Apple Inc.",
    789019: "Microsoft Corp.",
    1652044: "Alphabet Inc.",
    1326801: "Meta Platforms Inc.",
    1045810: "NVIDIA Corp.",
    1318605: "Tesla Inc.",
    1018724: "Amazon.com Inc.",
    2488: "Advanced Micro Devices Inc.",
    50863: "Intel Corp.",
    1730168: "Broadcom Inc.",
    1341439: "Oracle Corp.",
    1108524: "Salesforce Inc.",
    1373715: "ServiceNow Inc.",
    796343: "Adobe Inc.",
    1321655: "Palantir Technologies Inc.",
    1640147: "Snowflake Inc.",
    1535527: "CrowdStrike Holdings Inc.",
    1477333: "Cloudflare Inc.",
    1561550: "Datadog Inc.",
    1594805: "Shopify Inc.",
    1543151: "Uber Technologies Inc.",
    1559720: "Airbnb Inc.",
    1679788: "Coinbase Global Inc.",
    1512673: "Block Inc.",
    1633917: "PayPal Holdings Inc.",
    1065280: "Netflix Inc.",
    1639920: "Spotify Technology S.A.",
    1315098: "Roblox Corp.",
    1810806: "Unity Software Inc.",
    1973239: "Arm Holdings plc",
    1046179: "Taiwan Semiconductor Manufacturing Co. Ltd.",
    937966: "ASML Holding N.V.",
    804328: "QUALCOMM Inc.",
    97476: "Texas Instruments Inc.",
    723125: "Micron Technology Inc.",
    1571996: "Dell Technologies Inc.",
    47217: "HP Inc.",
    51143: "International Business Machines Corp.",
    858877: "Cisco Systems Inc.",
    1090872: "Agilent Technologies Inc.",
    1559813: "Wix.com Ltd.",
    1418091: "Twilio Inc.",
    1327811: "Workday Inc.",
    1506293: "Pinterest Inc.",
    1441816: "MongoDB Inc.",
    1166691: "Comcast Corp.",
    1585521: "Zoom Communications Inc.",
    1101239: "Equinix Inc.",
    106040: "Western Digital Corp.",
    1835632: "Marvell Technology Inc.",
    707549: "Lam Research Corp.",
    6951: "Applied Materials Inc.",
}

# Title shape: "8-K - APPLE INC (0000320193) (Filer)"
_TITLE_RE = re.compile(
    r"^\s*(?P<form>.+?)\s*-\s*(?P<company>.+?)\s*\((?P<cik>\d+)\)",
)

# Atom namespace used by the EDGAR feed.
_ATOM_NS = "{http://www.w3.org/2005/Atom}"


def _parse_dt(value: str | None) -> datetime | None:
    """Parse an EDGAR Atom timestamp to an aware UTC datetime."""
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


def _entry_form_type(entry: ET.Element, title: str) -> str | None:
    """Form type comes from the <category term="..."> element when present,
    else falls back to the leading token of the entry <title>."""
    cat = entry.find(f"{_ATOM_NS}category")
    if cat is not None:
        term = (cat.get("term") or "").strip()
        if term:
            return term
    m = _TITLE_RE.match(title)
    if m:
        return m.group("form").strip()
    return None


async def fetch_recent_filings(since_minutes: int = 30) -> list[Trend]:
    """Fetch recent EDGAR filings, filtered to newsworthy forms from the
    ``TECH_CIKS`` roster and submitted within ``since_minutes``."""
    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        r = await client.get(
            EDGAR_CURRENT_URL,
            headers={
                "User-Agent": SEC_USER_AGENT,
                "Accept-Encoding": "gzip, deflate",
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
        title_el = entry.find(f"{_ATOM_NS}title")
        title_text = (title_el.text or "").strip() if title_el is not None else ""
        if not title_text:
            continue

        m = _TITLE_RE.match(title_text)
        if not m:
            continue
        company = m.group("company").strip()
        try:
            cik = int(m.group("cik"))
        except ValueError:
            continue

        # TECH_CIKS filter — drop non-tech filers entirely.
        if cik not in TECH_CIKS:
            continue
        company_name = TECH_CIKS[cik]

        form = _entry_form_type(entry, title_text)
        if not form or form not in NEWSWORTHY_FORMS:
            continue

        # Filing date: <updated> is acceptance time on the getcurrent feed.
        updated_el = entry.find(f"{_ATOM_NS}updated")
        filed_dt = _parse_dt(updated_el.text if updated_el is not None else None)
        if filed_dt is None or filed_dt < cutoff:
            continue

        link_el = entry.find(f"{_ATOM_NS}link")
        url = link_el.get("href") if link_el is not None else None

        summary_el = entry.find(f"{_ATOM_NS}summary")
        summary = (summary_el.text or "").strip() if summary_el is not None else None

        published_at = filed_dt.isoformat().replace("+00:00", "Z")
        headline = f"{company_name} files {form} with the SEC"

        out.append(Trend(
            title=headline,
            description=summary or (
                f"{company_name} ({company}, CIK {cik}) filed a {form} "
                f"with the U.S. Securities and Exchange Commission."
            ),
            url=url,
            image_url=None,
            source="SEC EDGAR",
            provider="sec-edgar",
            published_at=published_at,
            raw={
                "form": form,
                "cik": cik,
                "company": company_name,
                "company_raw": company,
                "filed_at": published_at,
                "title": title_text,
            },
            author=None,
            provider_kind="sec-edgar",
            is_primary=True,
        ))

    return out
