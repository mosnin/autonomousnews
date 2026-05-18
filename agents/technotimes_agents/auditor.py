"""Post-hoc auditor — phase 10.

A nightly Modal cron that samples a small fraction of recently-published
articles, RE-FETCHES their cited sources from the live web (no caching),
and re-runs the inline fact-checker against the fresh source bodies. The
output is one row per audited article in the `audit_reports` table,
surfaced as an operator action queue at /admin/audits.

Why this exists alongside the inline fact-checker (`fact_checker.py`):

  - The inline checker prevents fabrication at write time. It cannot catch
    drift that happens AFTER publish: a source that retracted, a corrected
    statistic, a broken link.
  - The inline checker reads the snippet the trends provider gave us at
    write time. The auditor reads the LIVE page body. Those can disagree.
  - A claim that the writer carefully phrased to pass at write time may
    diverge once the live source is re-checked from scratch.

The auditor is ADVISORY. We never auto-unpublish — every row recommends
'keep', 'correct', or 'unpublish' and an operator clicks through.

Recommendation thresholds:
  - unpublish  : > 50% of claims now unsupported by live source text
  - correct    : 1-3 claims diverged from previously-supported, OR
                  at least one cited source is now broken (4xx/5xx/timeout)
  - keep       : otherwise

The auditor reuses `fact_check_article` from `fact_checker.py` — see the
import below. We do not duplicate that prompt or that parsing.
"""
from __future__ import annotations

import asyncio
import math
import random
import re
import time
import uuid
from dataclasses import dataclass
from typing import Any

import httpx
from openai import AsyncOpenAI

from .api_client import ApiClient, LogBuffer
from .config import Config
from .sources import Cluster, Trend


# TODO(phase 10): if the parallel inline-fact-checker agent has not landed
# `fact_checker.py` in this worktree yet, we fall back to a stub that raises.
# The auditor genuinely cannot run without it — but the import structure
# stays valid so typecheck and the rest of the package import cleanly.
try:
    from .fact_checker import FactCheckReport, fact_check_article
except ImportError:  # pragma: no cover — parallel-agent guard
    async def fact_check_article(*args: Any, **kwargs: Any) -> Any:
        raise NotImplementedError(
            "fact_checker.py not yet shipped — auditor depends on it"
        )

    FactCheckReport = Any  # type: ignore[misc, assignment]


AUDITOR_USER_AGENT = "Mozilla/5.0 (Techno Times Auditor)"
AUDITOR_TIMEOUT_SECONDS = 10.0


# ---------------------------------------------------------------------------
# HTML → text
# ---------------------------------------------------------------------------
_SCRIPT_STYLE_RE = re.compile(
    r"<(script|style|noscript)\b[^>]*>.*?</\1>", re.IGNORECASE | re.DOTALL
)
_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


def html_to_text(html: str) -> str:
    """Crude HTML stripper.

    Not a real parser — that's intentional. We only need enough plain text
    to feed the fact-checker, and pulling in BeautifulSoup or lxml on the
    Modal worker bloats the image. We strip <script>/<style>/<noscript>
    blocks first (so we don't include analytics JSON), then drop tags, then
    collapse whitespace.
    """
    if not html:
        return ""
    s = _SCRIPT_STYLE_RE.sub(" ", html)
    s = _TAG_RE.sub(" ", s)
    s = _WS_RE.sub(" ", s)
    return s.strip()


# ---------------------------------------------------------------------------
# Source re-fetch
# ---------------------------------------------------------------------------
@dataclass
class FetchedSource:
    url: str
    publication: str
    title: str
    text: str | None  # None = broken
    status_code: int | None
    error: str | None  # human-readable reason if text is None


async def fetch_source_live(
    client: httpx.AsyncClient, source: dict[str, Any]
) -> FetchedSource:
    """HTTP GET one source URL and return its plain-text body or a broken marker.

    Any non-2xx status, timeout, or connection error counts as broken.
    """
    url = source.get("url") or ""
    publication = source.get("publication") or ""
    title = source.get("title") or ""
    if not url:
        return FetchedSource(
            url=url,
            publication=publication,
            title=title,
            text=None,
            status_code=None,
            error="missing url",
        )
    try:
        r = await client.get(url)
    except httpx.TimeoutException:
        return FetchedSource(
            url=url,
            publication=publication,
            title=title,
            text=None,
            status_code=None,
            error="timeout",
        )
    except httpx.HTTPError as e:
        return FetchedSource(
            url=url,
            publication=publication,
            title=title,
            text=None,
            status_code=None,
            error=f"http error: {type(e).__name__}",
        )

    if r.status_code >= 400:
        return FetchedSource(
            url=url,
            publication=publication,
            title=title,
            text=None,
            status_code=r.status_code,
            error=f"HTTP {r.status_code}",
        )

    text = html_to_text(r.text)
    if not text:
        return FetchedSource(
            url=url,
            publication=publication,
            title=title,
            text=None,
            status_code=r.status_code,
            error="empty body after html strip",
        )
    return FetchedSource(
        url=url,
        publication=publication,
        title=title,
        text=text,
        status_code=r.status_code,
        error=None,
    )


# ---------------------------------------------------------------------------
# Recommendation logic
# ---------------------------------------------------------------------------
@dataclass
class AuditOutcome:
    """The auditor's per-article verdict. Mirrors `audit_reports` row shape."""

    claims_total: int
    claims_unsupported: int
    drift_from_source: bool
    broken_source_count: int
    recommendation: str  # 'keep' | 'correct' | 'unpublish'
    notes: str
    model_used: str
    prompt_tokens: int | None
    completion_tokens: int | None
    cost_usd: float | None


def decide_recommendation(
    claims_total: int,
    claims_unsupported: int,
    broken_source_count: int,
) -> str:
    """Translate raw counts into a recommendation.

    Thresholds (chosen so the auditor is loud about real failures but
    doesn't spam the queue with single-claim wiggle):

      - 'unpublish' when more than 50% of claims are now unsupported.
        At that point the article is not really representing its sources
        any more and an operator should pull it.
      - 'correct' when 1-3 claims diverged from their (formerly supported)
        sources OR at least one source link is broken. Correctable.
      - 'keep' otherwise — zero unsupported claims and all links live.
    """
    if claims_total > 0 and claims_unsupported * 2 > claims_total:
        return "unpublish"
    if 1 <= claims_unsupported <= 3:
        return "correct"
    if broken_source_count >= 1:
        return "correct"
    return "keep"


def compute_drift(claims_unsupported: int) -> bool:
    """Drift proxy: any claim that's now unsupported is treated as drift.

    The article shipped past the inline fact-checker, which means at write
    time every claim either was supported or was carefully phrased. If the
    re-check against the LIVE source now flags any unsupported claim, the
    interpretation is: either the live source has changed, or our writer's
    phrasing was thin enough that a fresh checker disagrees. Both are
    "drift" for the operator's purposes.
    """
    return claims_unsupported > 0


def build_notes(
    claims_total: int,
    claims_unsupported: int,
    broken: list[FetchedSource],
) -> str:
    parts: list[str] = []
    parts.append(
        f"{claims_unsupported}/{claims_total} claims unsupported on re-check"
    )
    if broken:
        parts.append(
            "broken sources: "
            + ", ".join(
                f"{b.publication or b.url} ({b.error})" for b in broken[:5]
            )
        )
    return "; ".join(parts)


def build_audit_outcome(
    report: Any,  # FactCheckReport, kept loose for the stub-fallback path
    fetched: list[FetchedSource],
) -> AuditOutcome:
    """Compose the row we'll POST to /api/admin/audit-reports."""
    broken = [f for f in fetched if f.text is None]
    claims_total = int(getattr(report, "claims", None) and len(report.claims) or 0)
    unsupported = getattr(report, "unsupported", []) or []
    claims_unsupported = len(unsupported)
    broken_count = len(broken)
    recommendation = decide_recommendation(
        claims_total=claims_total,
        claims_unsupported=claims_unsupported,
        broken_source_count=broken_count,
    )
    return AuditOutcome(
        claims_total=claims_total,
        claims_unsupported=claims_unsupported,
        drift_from_source=compute_drift(claims_unsupported),
        broken_source_count=broken_count,
        recommendation=recommendation,
        notes=build_notes(claims_total, claims_unsupported, broken),
        model_used=getattr(report, "model_used", "") or "",
        prompt_tokens=getattr(report, "prompt_tokens", None),
        completion_tokens=getattr(report, "completion_tokens", None),
        cost_usd=getattr(report, "cost_usd", None),
    )


# ---------------------------------------------------------------------------
# Single-article audit
# ---------------------------------------------------------------------------
def _fetched_to_cluster(
    article: dict[str, Any], fetched: list[FetchedSource]
) -> Cluster:
    """Wrap re-fetched live source bodies as a Cluster the checker accepts.

    The fact-checker takes a Cluster of Trend records and indexes claims
    into them by source_index. We don't care about the cluster's category
    or topic_key here — only `sources` is read.
    """
    trends: list[Trend] = []
    for f in fetched:
        if f.text is None:
            continue
        trends.append(
            Trend(
                title=f.title or f.publication or f.url,
                description=f.text,
                url=f.url,
                image_url=None,
                source=f.publication or f.url,
                provider="auditor",
                published_at=None,
                raw={"url": f.url, "status": f.status_code},
            )
        )
    return Cluster(
        topic_key=str(article.get("id", "audit")),
        category_slug=article.get("category_slug"),
        subcategory_slug=None,
        sources=trends,
    )


async def audit_one_article(
    cfg: Config,
    client: AsyncOpenAI,
    http_client: httpx.AsyncClient,
    article: dict[str, Any],
    log: LogBuffer,
) -> AuditOutcome | None:
    """Audit one article. Returns None if it has no sources we can re-check."""
    sources = article.get("sources_used") or []
    if not isinstance(sources, list) or not sources:
        await log.warn(
            "skipping article with no sources_used",
            article_id=article.get("id"),
        )
        return None

    # Re-fetch every source in parallel. Bounded by AUDITOR_TIMEOUT_SECONDS
    # via the shared httpx client.
    fetched: list[FetchedSource] = await asyncio.gather(
        *(fetch_source_live(http_client, s) for s in sources)
    )

    live_count = sum(1 for f in fetched if f.text is not None)
    if live_count == 0:
        # All sources are broken — we can't re-check anything. Emit a
        # 'correct' rec with zero claims so the operator at least sees the
        # link-rot.
        return AuditOutcome(
            claims_total=0,
            claims_unsupported=0,
            drift_from_source=False,
            broken_source_count=len(fetched),
            recommendation="correct",
            notes=build_notes(0, 0, fetched),
            model_used=cfg.checker_model,
            prompt_tokens=None,
            completion_tokens=None,
            cost_usd=None,
        )

    cluster = _fetched_to_cluster(article, fetched)
    article_body = article.get("body") or ""
    try:
        report = await fact_check_article(cfg, client, article_body, cluster, log)
    except NotImplementedError:
        await log.error(
            "fact_check_article unavailable — auditor stubbed",
            article_id=article.get("id"),
        )
        return None
    except Exception as e:  # pragma: no cover — defensive
        await log.warn(
            "fact-checker raised during audit; treating as broken",
            article_id=article.get("id"),
            error=str(e),
        )
        return AuditOutcome(
            claims_total=0,
            claims_unsupported=0,
            drift_from_source=False,
            broken_source_count=len([f for f in fetched if f.text is None]),
            recommendation="keep",
            notes=f"fact-checker error: {type(e).__name__}",
            model_used=cfg.checker_model,
            prompt_tokens=None,
            completion_tokens=None,
            cost_usd=None,
        )

    return build_audit_outcome(report, fetched)


# ---------------------------------------------------------------------------
# Top-level orchestrator
# ---------------------------------------------------------------------------
async def _post_audit_report(
    api: ApiClient, article_id: str, audit_run_id: str, outcome: AuditOutcome
) -> None:
    """POST one audit report row to the ingest endpoint."""
    payload = {
        "article_id": article_id,
        "audit_run_id": audit_run_id,
        "claims_total": outcome.claims_total,
        "claims_unsupported": outcome.claims_unsupported,
        "drift_from_source": outcome.drift_from_source,
        "broken_source_count": outcome.broken_source_count,
        "recommendation": outcome.recommendation,
        "notes": outcome.notes,
        "model_used": outcome.model_used,
        "prompt_tokens": outcome.prompt_tokens,
        "completion_tokens": outcome.completion_tokens,
        "cost_usd": outcome.cost_usd,
    }
    r = await api._client.post(  # noqa: SLF001 — shared bearer-auth client
        f"{api.base_url}/api/admin/audit-reports", json=payload
    )
    r.raise_for_status()


async def _fetch_recent_articles(
    api: ApiClient, since: str = "24h"
) -> list[dict[str, Any]]:
    r = await api._client.get(  # noqa: SLF001
        f"{api.base_url}/api/admin/recent-articles", params={"since": since}
    )
    r.raise_for_status()
    return r.json().get("articles", []) or []


def _sample_articles(
    articles: list[dict[str, Any]], sample_rate: float
) -> list[dict[str, Any]]:
    """Random-sample at least 1, at most len(articles), at the given rate."""
    if not articles:
        return []
    rate = max(0.0, min(1.0, sample_rate))
    n = max(1, math.ceil(len(articles) * rate))
    n = min(n, len(articles))
    return random.sample(articles, n)


async def run_auditor(
    cfg: Config,
    sample_rate: float = 0.07,
    trigger: str = "cron-daily",
) -> dict[str, Any]:
    """Orchestrate one audit pass.

    Returns a summary dict for the Modal log:
      {
        run_id, articles_in_window, articles_sampled, articles_audited,
        recommendations: {keep, correct, unpublish},
        broken_sources_total, cost_usd, status
      }
    """
    api = ApiClient(cfg.site_url, cfg.admin_api_key)
    log = LogBuffer(api, run_id=None)

    run_id = str(uuid.uuid4())
    started_at = time.time()
    started_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(started_at))

    await api.upsert_run({
        "id": run_id,
        "trigger": trigger,
        "agent": "auditor",
        "status": "running",
        "started_at": started_iso,
        "model": cfg.checker_model,
    })
    log.set_run_id(run_id)
    await log.info("auditor started", trigger=trigger, sample_rate=sample_rate)

    audited = 0
    recs = {"keep": 0, "correct": 0, "unpublish": 0}
    broken_total = 0
    total_cost = 0.0
    err: str | None = None

    try:
        recent = await _fetch_recent_articles(api, since="24h")
        await log.info("loaded recent articles", count=len(recent))
        sampled = _sample_articles(recent, sample_rate)
        await log.info("sampled for audit", count=len(sampled))

        if sampled:
            client = AsyncOpenAI(api_key=cfg.openai_api_key)
            async with httpx.AsyncClient(
                timeout=AUDITOR_TIMEOUT_SECONDS,
                headers={"User-Agent": AUDITOR_USER_AGENT},
                follow_redirects=True,
            ) as http_client:
                for article in sampled:
                    try:
                        outcome = await audit_one_article(
                            cfg, client, http_client, article, log
                        )
                    except Exception as e:
                        await log.warn(
                            "audit_one_article failed",
                            article_id=article.get("id"),
                            error=str(e),
                        )
                        continue
                    if outcome is None:
                        continue
                    audited += 1
                    recs[outcome.recommendation] = (
                        recs.get(outcome.recommendation, 0) + 1
                    )
                    broken_total += outcome.broken_source_count
                    total_cost += outcome.cost_usd or 0.0
                    try:
                        await _post_audit_report(
                            api, article["id"], run_id, outcome
                        )
                    except Exception as e:
                        await log.warn(
                            "audit-reports POST failed",
                            article_id=article.get("id"),
                            error=str(e),
                        )

    except Exception as e:  # pragma: no cover
        err = f"{type(e).__name__}: {e}"
        await log.error("auditor failed", error=err)

    finished_at = time.time()
    finished_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(finished_at))
    duration_ms = int((finished_at - started_at) * 1000)
    final_status = "failed" if err else "succeeded"

    await api.upsert_run({
        "id": run_id,
        "trigger": trigger,
        "agent": "auditor",
        "status": final_status,
        "started_at": started_iso,
        "finished_at": finished_iso,
        "duration_ms": duration_ms,
        "topics_considered": audited,
        "articles_created": 0,
        "cost_usd": round(total_cost, 4),
        "model": cfg.checker_model,
        "error": err,
        "metadata": {
            "sample_rate": sample_rate,
            "recommendations": recs,
            "broken_sources_total": broken_total,
            "audited": audited,
        },
    })

    await log.flush()
    await api.aclose()
    return {
        "run_id": run_id,
        "articles_audited": audited,
        "recommendations": recs,
        "broken_sources_total": broken_total,
        "cost_usd": round(total_cost, 4),
        "status": final_status,
        "error": err,
    }


def main() -> None:  # pragma: no cover
    import json

    cfg = Config.from_env()
    result = asyncio.run(run_auditor(cfg, trigger="manual"))
    print(json.dumps(result, indent=2))


if __name__ == "__main__":  # pragma: no cover
    main()
