"""Validate outbound markdown links in writer-produced article bodies.

Two rejection cases:
  1. Allow-list: a link URL is not present in the cluster's source URLs.
     This catches fabricated URLs (the writer inventing a plausible-looking
     domain that does not in fact appear in the source set we passed it).
  2. Liveness: HEAD request returns 4xx/5xx OR raises a connection error.
     This catches URLs that may once have existed but no longer resolve.

The validator returns a `ValidationResult` dataclass that the pipeline uses
to decide whether to publish the article or skip it for this run.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Iterable

import httpx


# Match a markdown link: [text](url). Captures the URL only.
_LINK_RE = re.compile(r"\[[^\]]+\]\(([^)]+)\)")


def extract_external_links(body: str) -> list[str]:
    """Return all external markdown link URLs in the body, in order, deduped."""
    seen: set[str] = set()
    out: list[str] = []
    for url in _LINK_RE.findall(body or ""):
        url = url.strip()
        if not url.startswith("http"):
            continue
        if url in seen:
            continue
        seen.add(url)
        out.append(url)
    return out


@dataclass
class ValidationResult:
    ok: bool
    reason: str | None = None
    invented_urls: list[str] = field(default_factory=list)
    dead_urls: list[str] = field(default_factory=list)


async def validate_outbound_links(
    article_body: str,
    allowed_urls: Iterable[str],
    *,
    timeout_s: float = 10.0,
    client: httpx.AsyncClient | None = None,
) -> ValidationResult:
    """Validate that every external link in the body is in the allow-list AND live.

    The allow-list is the set of URLs from the cluster's sources. The writer
    may NOT introduce a URL that did not come from those sources.

    HEAD requests are issued for liveness; 4xx/5xx is a fail. Connection
    errors also fail (we treat unreachable as broken — better to drop an
    article than to ship a citation that does not resolve).
    """
    allowed = {u for u in allowed_urls if u}
    links = extract_external_links(article_body)
    invented = [u for u in links if u not in allowed]
    if invented:
        return ValidationResult(
            ok=False,
            reason=f"writer introduced URL(s) not in cluster sources: {invented}",
            invented_urls=invented,
        )

    if not links:
        return ValidationResult(ok=True)

    owns_client = client is None
    if owns_client:
        client = httpx.AsyncClient(
            timeout=timeout_s,
            follow_redirects=True,
            headers={"User-Agent": "TechnoTimes-LinkValidator/1.0"},
        )

    dead: list[str] = []
    try:
        for url in links:
            try:
                resp = await client.head(url)
                if resp.status_code >= 400:
                    # Some hosts disallow HEAD; retry with GET before failing.
                    try:
                        resp2 = await client.get(url)
                        if resp2.status_code >= 400:
                            dead.append(url)
                    except Exception:
                        dead.append(url)
            except Exception:
                dead.append(url)
    finally:
        if owns_client:
            await client.aclose()

    if dead:
        return ValidationResult(
            ok=False,
            reason=f"source URL(s) returned 4xx/5xx or unreachable: {dead}",
            dead_urls=dead,
        )

    return ValidationResult(ok=True)
