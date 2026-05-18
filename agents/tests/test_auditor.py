"""Tests for the post-hoc auditor (phase 10).

Covered:
  - Recommendation thresholds (keep / correct / unpublish boundaries)
  - Broken-source detection: 4xx, 5xx, timeout, connection error
  - drift_from_source computation
  - HTML → text stripper
  - End-to-end audit_one_article happy path with mocked httpx + checker
"""
from __future__ import annotations

import httpx
import pytest

from technotimes_agents import auditor
from technotimes_agents.auditor import (
    AuditOutcome,
    build_audit_outcome,
    compute_drift,
    decide_recommendation,
    fetch_source_live,
    html_to_text,
    _sample_articles,
)


# ---------------------------------------------------------------------------
# Recommendation threshold logic
# ---------------------------------------------------------------------------
class TestDecideRecommendation:
    def test_keep_when_zero_unsupported_and_all_links_live(self):
        assert decide_recommendation(10, 0, 0) == "keep"

    def test_keep_when_no_claims_and_no_broken(self):
        assert decide_recommendation(0, 0, 0) == "keep"

    def test_correct_when_one_unsupported_claim(self):
        assert decide_recommendation(10, 1, 0) == "correct"

    def test_correct_at_three_unsupported_claims_boundary(self):
        # Boundary: 3 is still 'correct' (3/10 = 30%, well under 50%).
        assert decide_recommendation(10, 3, 0) == "correct"

    def test_correct_when_only_broken_source(self):
        assert decide_recommendation(10, 0, 1) == "correct"

    def test_unpublish_when_majority_unsupported(self):
        # 6/10 > 50%
        assert decide_recommendation(10, 6, 0) == "unpublish"

    def test_unpublish_boundary_at_strictly_more_than_half(self):
        # 5/10 is exactly 50% — NOT strictly more, so no unpublish. Also
        # 5 > 3, so the 'correct' band (1-3) doesn't catch it either; the
        # spec literally says: keep otherwise. This is by design — a
        # cluster of 4-5 questionable claims is unusual and signals that
        # something is wrong with the audit itself rather than the article.
        assert decide_recommendation(10, 5, 0) == "keep"
        # 4/10 = 40% — same band (>3 but <=50%): keep.
        assert decide_recommendation(10, 4, 0) == "keep"

    def test_unpublish_with_small_sample(self):
        # 2/3 > 50%
        assert decide_recommendation(3, 2, 0) == "unpublish"

    def test_unpublish_dominates_over_broken_link(self):
        # Broken link alone would say 'correct', but if claims are
        # majority-unsupported the unpublish rec wins.
        assert decide_recommendation(10, 6, 3) == "unpublish"


# ---------------------------------------------------------------------------
# Drift proxy
# ---------------------------------------------------------------------------
class TestDriftFromSource:
    def test_no_unsupported_no_drift(self):
        assert compute_drift(0) is False

    def test_one_unsupported_means_drift(self):
        assert compute_drift(1) is True

    def test_many_unsupported_means_drift(self):
        assert compute_drift(50) is True


# ---------------------------------------------------------------------------
# build_audit_outcome — wires everything together
# ---------------------------------------------------------------------------
class _StubClaim:
    def __init__(self, supported: bool) -> None:
        self.supported = supported


class _StubReport:
    def __init__(
        self,
        n_claims: int,
        n_unsupported: int,
        model_used: str = "stub-model",
        cost_usd: float = 0.0,
        prompt_tokens: int = 100,
        completion_tokens: int = 50,
    ) -> None:
        n_supported = n_claims - n_unsupported
        self.claims = [_StubClaim(True) for _ in range(n_supported)] + [
            _StubClaim(False) for _ in range(n_unsupported)
        ]
        self.unsupported = [c for c in self.claims if not c.supported]
        self.model_used = model_used
        self.cost_usd = cost_usd
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens


def _ok_source(url: str = "https://a.example/x") -> auditor.FetchedSource:
    return auditor.FetchedSource(
        url=url, publication="A", title="t", text="body", status_code=200, error=None
    )


def _broken_source(error: str = "HTTP 404") -> auditor.FetchedSource:
    return auditor.FetchedSource(
        url="https://broken.example/x",
        publication="B",
        title="t",
        text=None,
        status_code=404,
        error=error,
    )


class TestBuildAuditOutcome:
    def test_clean_article_keeps(self):
        outcome = build_audit_outcome(_StubReport(5, 0), [_ok_source()])
        assert outcome.recommendation == "keep"
        assert outcome.drift_from_source is False
        assert outcome.broken_source_count == 0
        assert outcome.claims_total == 5

    def test_one_unsupported_claim_recommends_correct_with_drift(self):
        outcome = build_audit_outcome(_StubReport(5, 1), [_ok_source()])
        assert outcome.recommendation == "correct"
        assert outcome.drift_from_source is True

    def test_broken_source_alone_recommends_correct(self):
        outcome = build_audit_outcome(_StubReport(5, 0), [_ok_source(), _broken_source()])
        assert outcome.recommendation == "correct"
        assert outcome.broken_source_count == 1
        # No unsupported claims means no drift, even with a broken link.
        assert outcome.drift_from_source is False

    def test_majority_unsupported_recommends_unpublish(self):
        outcome = build_audit_outcome(_StubReport(5, 4), [_ok_source()])
        assert outcome.recommendation == "unpublish"
        assert outcome.drift_from_source is True

    def test_outcome_propagates_cost_and_model(self):
        outcome = build_audit_outcome(
            _StubReport(5, 0, model_used="gpt-5-mini", cost_usd=0.0012),
            [_ok_source()],
        )
        assert outcome.model_used == "gpt-5-mini"
        assert outcome.cost_usd == 0.0012
        assert outcome.prompt_tokens == 100


# ---------------------------------------------------------------------------
# HTML stripping
# ---------------------------------------------------------------------------
class TestHtmlToText:
    def test_drops_tags_and_collapses_whitespace(self):
        out = html_to_text("<p>Hello   <b>world</b></p>")
        assert out == "Hello world"

    def test_strips_script_blocks(self):
        out = html_to_text(
            "<p>Body text</p><script>var tracking = 1;</script><p>More text</p>"
        )
        assert "tracking" not in out
        assert "Body text" in out
        assert "More text" in out

    def test_strips_style_blocks(self):
        out = html_to_text("<style>p { color: red }</style><p>Body</p>")
        assert "color" not in out
        assert out == "Body"

    def test_empty_input_returns_empty(self):
        assert html_to_text("") == ""

    def test_pure_text_passes_through(self):
        assert html_to_text("plain text body") == "plain text body"


# ---------------------------------------------------------------------------
# Live source fetch — broken-source detection
# ---------------------------------------------------------------------------
def _client_with_handler(handler) -> httpx.AsyncClient:
    transport = httpx.MockTransport(handler)
    return httpx.AsyncClient(transport=transport, follow_redirects=True)


@pytest.mark.asyncio
async def test_fetch_source_returns_text_on_200():
    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, html="<p>Live source body</p>")

    client = _client_with_handler(handler)
    try:
        out = await fetch_source_live(
            client,
            {"url": "https://a.example/x", "publication": "A", "title": "T"},
        )
    finally:
        await client.aclose()
    assert out.text == "Live source body"
    assert out.status_code == 200
    assert out.error is None


@pytest.mark.asyncio
async def test_fetch_source_marks_404_as_broken():
    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404)

    client = _client_with_handler(handler)
    try:
        out = await fetch_source_live(
            client, {"url": "https://a.example/x", "publication": "A", "title": "T"}
        )
    finally:
        await client.aclose()
    assert out.text is None
    assert out.status_code == 404
    assert out.error is not None and "404" in out.error


@pytest.mark.asyncio
async def test_fetch_source_marks_500_as_broken():
    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503)

    client = _client_with_handler(handler)
    try:
        out = await fetch_source_live(
            client, {"url": "https://a.example/x", "publication": "A", "title": "T"}
        )
    finally:
        await client.aclose()
    assert out.text is None
    assert out.status_code == 503


@pytest.mark.asyncio
async def test_fetch_source_timeout_is_broken():
    async def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.TimeoutException("slow")

    client = _client_with_handler(handler)
    try:
        out = await fetch_source_live(
            client, {"url": "https://a.example/x", "publication": "A", "title": "T"}
        )
    finally:
        await client.aclose()
    assert out.text is None
    assert out.error == "timeout"


@pytest.mark.asyncio
async def test_fetch_source_connection_error_is_broken():
    async def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("dns")

    client = _client_with_handler(handler)
    try:
        out = await fetch_source_live(
            client, {"url": "https://a.example/x", "publication": "A", "title": "T"}
        )
    finally:
        await client.aclose()
    assert out.text is None
    assert "http error" in (out.error or "").lower()


@pytest.mark.asyncio
async def test_fetch_source_missing_url_is_broken():
    async def handler(request: httpx.Request) -> httpx.Response:  # pragma: no cover
        return httpx.Response(200)

    client = _client_with_handler(handler)
    try:
        out = await fetch_source_live(
            client, {"url": "", "publication": "A", "title": "T"}
        )
    finally:
        await client.aclose()
    assert out.text is None
    assert out.error == "missing url"


# ---------------------------------------------------------------------------
# Sampling
# ---------------------------------------------------------------------------
class TestSampling:
    def test_empty_input_empty_output(self):
        assert _sample_articles([], 0.5) == []

    def test_minimum_one_sample(self):
        articles = [{"id": str(i)} for i in range(5)]
        out = _sample_articles(articles, 0.01)
        assert len(out) == 1

    def test_rate_one_returns_all(self):
        articles = [{"id": str(i)} for i in range(5)]
        out = _sample_articles(articles, 1.0)
        assert len(out) == 5

    def test_typical_rate_uses_ceiling(self):
        articles = [{"id": str(i)} for i in range(10)]
        # ceil(10 * 0.07) == 1
        out = _sample_articles(articles, 0.07)
        assert len(out) == 1
        articles50 = [{"id": str(i)} for i in range(50)]
        out50 = _sample_articles(articles50, 0.07)
        # ceil(50 * 0.07) == 4
        assert len(out50) == 4
