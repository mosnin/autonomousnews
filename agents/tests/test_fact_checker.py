"""Tests for the adversarial fact-checker.

These tests pin the contract — they do NOT call OpenAI. The whole point
of the checker is its prompt and its parsing logic, so we mock the LLM
response and assert the report comes out the way `run_pipeline` expects
to consume it.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

from technotimes_agents.config import Config
from technotimes_agents.fact_checker import (
    FACT_CHECKER_SYSTEM,
    Claim,
    FactCheckReport,
    _classify_verdict,
    _parse_claims,
    fact_check_article,
    summarize_report,
)
from technotimes_agents.sources import Cluster, Trend


# --- fixtures --------------------------------------------------------------
def _cfg(checker_model: str = "gpt-5-mini", writer_model: str = "gpt-4o-mini") -> Config:
    """Build a Config without touching the environment."""
    return Config(
        site_url="https://example.test",
        admin_api_key="k",
        openai_api_key="k",
        newsapi_key=None,
        thenewsapi_token=None,
        daily_budget_usd=10.0,
        editor_model="gpt-4o-mini",
        writer_model=writer_model,
        image_model="dall-e-3",
        pillar_model="gpt-5-mini",
        checker_model=checker_model,
        articles_per_run_min=1,
        articles_per_run_max=3,
        evergreen_ratio=0.3,
        dry_run=False,
    )


def _trend(title: str, source: str, url: str, desc: str) -> Trend:
    return Trend(
        title=title,
        description=desc,
        url=url,
        image_url=None,
        source=source,
        provider="newsapi",
        published_at=None,
        raw={},
    )


def _cluster() -> Cluster:
    return Cluster(
        topic_key="t",
        category_slug="technology",
        subcategory_slug=None,
        sources=[
            _trend(
                "Acme Co buys Foo for $1B",
                "Reuters",
                "https://reuters.example/a",
                "Acme Co announced a $1 billion acquisition of Foo Inc on Tuesday.",
            ),
            _trend(
                "Acme picks up Foo",
                "Bloomberg",
                "https://bloomberg.example/b",
                "The deal closes in Q3, sources told Bloomberg.",
            ),
        ],
    )


class _FakeLog:
    """Minimal LogBuffer stand-in that records messages for assertions."""

    def __init__(self) -> None:
        self.entries: list[tuple[str, str, dict[str, Any]]] = []

    async def info(self, message: str, **kw: Any) -> None:
        self.entries.append(("info", message, kw))

    async def warn(self, message: str, **kw: Any) -> None:
        self.entries.append(("warn", message, kw))

    async def error(self, message: str, **kw: Any) -> None:
        self.entries.append(("error", message, kw))


def _mock_openai_client(payloads: list[dict[str, Any]]) -> Any:
    """Build a stub AsyncOpenAI client that yields the given JSON payloads in order."""
    responses: list[Any] = []
    for payload in payloads:
        resp = MagicMock()
        resp.choices = [MagicMock()]
        resp.choices[0].message.content = json.dumps(payload)
        resp.usage = MagicMock(prompt_tokens=100, completion_tokens=50)
        responses.append(resp)

    client = MagicMock()
    client.chat = MagicMock()
    client.chat.completions = MagicMock()
    client.chat.completions.create = AsyncMock(side_effect=responses)
    return client


# --- prompt regression -----------------------------------------------------
def test_prompt_is_adversarial():
    """The whole point of this module is the adversarial framing — pin it."""
    assert (
        "adversarial fact-checker for Techno Times. You are NOT the writer"
        in FACT_CHECKER_SYSTEM
    )
    assert "Do NOT be sycophantic" in FACT_CHECKER_SYSTEM


def test_prompt_demands_json_only():
    assert "Output JSON only" in FACT_CHECKER_SYSTEM


# --- pure helpers ----------------------------------------------------------
def test_parse_claims_handles_garbage():
    assert _parse_claims(None) == []
    assert _parse_claims("not a list") == []
    assert _parse_claims([{"no_text": "x"}]) == []


def test_parse_claims_normalises_fields():
    out = _parse_claims(
        [
            {
                "text": "  Acme bought Foo  ",
                "supported": True,
                "supporting_quote_from_source": "Acme bought Foo",
                "source_index": 1,
            },
            {
                "text": "Made up fact",
                "supported": False,
                "supporting_quote_from_source": "",
                "source_index": None,
            },
        ]
    )
    assert len(out) == 2
    assert out[0].text == "Acme bought Foo"
    assert out[0].supported is True
    assert out[0].source_index == 1
    # Empty string quote becomes None
    assert out[1].supporting_quote_from_source is None
    assert out[1].supported is False


def test_classify_verdict_three_states():
    # 0 unsupported, model says pass -> pass
    v, r = _classify_verdict("pass", None, [])
    assert v == "pass" and r is None
    # 1 unsupported -> soft_fail
    one = [Claim(text="x", supported=False, supporting_quote_from_source=None, source_index=None)]
    v, r = _classify_verdict("fail", "bad", one)
    assert v == "soft_fail"
    # 3 unsupported -> hard fail
    three = [
        Claim(text="x", supported=False, supporting_quote_from_source=None, source_index=None)
        for _ in range(3)
    ]
    v, r = _classify_verdict("fail", "bad", three)
    assert v == "fail"


# --- end-to-end (mocked) ---------------------------------------------------
@pytest.mark.asyncio
async def test_pass_path_parses_report_and_costs():
    payload = {
        "claims": [
            {
                "text": "Acme Co announced a $1 billion acquisition.",
                "supported": True,
                "supporting_quote_from_source": "Acme Co announced a $1 billion acquisition of Foo Inc on Tuesday.",
                "source_index": 1,
            },
            {
                "text": "The deal closes in Q3.",
                "supported": True,
                "supporting_quote_from_source": "The deal closes in Q3, sources told Bloomberg.",
                "source_index": 2,
            },
        ],
        "verdict": "pass",
        "failure_reason": None,
    }
    client = _mock_openai_client([payload])
    log = _FakeLog()

    report = await fact_check_article(
        _cfg(), client, "Article body goes here.", _cluster(), log
    )

    assert report.verdict == "pass"
    assert len(report.claims) == 2
    assert report.unsupported == []
    assert report.model_used == "gpt-5-mini"
    assert report.prompt_tokens == 100
    assert report.completion_tokens == 50
    # cost = (100 * 0.25 + 50 * 2.0) / 1e6 = 125 / 1e6
    assert report.cost_usd == pytest.approx(125 / 1_000_000)
    # source_index references survived the cluster-size check
    assert report.claims[0].source_index == 1
    assert report.claims[1].source_index == 2


@pytest.mark.asyncio
async def test_fail_path_with_three_unsupported_claims():
    payload = {
        "claims": [
            {
                "text": "Acme paid $1 billion.",
                "supported": True,
                "supporting_quote_from_source": "Acme Co announced a $1 billion acquisition",
                "source_index": 1,
            },
            {
                "text": "The CEO of Acme is Jane Doe.",
                "supported": False,
                "supporting_quote_from_source": None,
                "source_index": None,
            },
            {
                "text": "The deal was announced in Paris.",
                "supported": False,
                "supporting_quote_from_source": None,
                "source_index": None,
            },
            {
                "text": "Foo had 200 employees at acquisition time.",
                "supported": False,
                "supporting_quote_from_source": None,
                "source_index": None,
            },
        ],
        "verdict": "fail",
        "failure_reason": "Three invented details about the deal",
    }
    client = _mock_openai_client([payload])
    log = _FakeLog()

    report = await fact_check_article(
        _cfg(), client, "Article body.", _cluster(), log
    )

    assert report.verdict == "fail"
    assert len(report.unsupported) == 3
    assert report.failure_reason and "invented" in report.failure_reason.lower()


@pytest.mark.asyncio
async def test_soft_fail_when_one_or_two_claims_unsupported():
    payload = {
        "claims": [
            {
                "text": "Acme paid $1 billion.",
                "supported": True,
                "supporting_quote_from_source": "Acme Co announced a $1 billion acquisition",
                "source_index": 1,
            },
            {
                "text": "Acme also opened a Tokyo office last week.",
                "supported": False,
                "supporting_quote_from_source": None,
                "source_index": None,
            },
        ],
        "verdict": "fail",
        "failure_reason": "Tokyo office is not in the sources",
    }
    client = _mock_openai_client([payload])
    log = _FakeLog()

    report = await fact_check_article(
        _cfg(), client, "Article body.", _cluster(), log
    )

    assert report.verdict == "soft_fail"
    assert len(report.unsupported) == 1
    assert report.failure_reason  # non-empty


@pytest.mark.asyncio
async def test_invalid_json_fails_closed():
    """If the checker returns garbage, we fail rather than pass."""
    resp = MagicMock()
    resp.choices = [MagicMock()]
    resp.choices[0].message.content = "not json at all"
    resp.usage = MagicMock(prompt_tokens=10, completion_tokens=5)

    client = MagicMock()
    client.chat = MagicMock()
    client.chat.completions = MagicMock()
    client.chat.completions.create = AsyncMock(return_value=resp)
    log = _FakeLog()

    report = await fact_check_article(
        _cfg(), client, "Body.", _cluster(), log
    )

    assert report.verdict == "fail"
    assert report.failure_reason is not None and "JSON" in report.failure_reason


@pytest.mark.asyncio
async def test_out_of_range_source_index_is_demoted_to_unsupported():
    """If the model invents a source_index, we drop it and mark the claim unsupported."""
    payload = {
        "claims": [
            # Valid: index 1 of a 2-source cluster
            {
                "text": "Real claim",
                "supported": True,
                "supporting_quote_from_source": "quote",
                "source_index": 1,
            },
            # Invalid: index 7 in a 2-source cluster
            {
                "text": "Hallucinated source claim",
                "supported": True,
                "supporting_quote_from_source": "fake quote",
                "source_index": 7,
            },
        ],
        "verdict": "pass",
        "failure_reason": None,
    }
    client = _mock_openai_client([payload])
    log = _FakeLog()

    report = await fact_check_article(
        _cfg(), client, "Body.", _cluster(), log
    )

    # The out-of-range claim is now unsupported -> verdict drops to soft_fail
    assert report.claims[1].source_index is None
    assert report.claims[1].supported is False
    assert report.verdict == "soft_fail"


@pytest.mark.asyncio
async def test_warns_when_checker_model_equals_writer_model():
    """Same-model config undermines the whole point — must log a warning."""
    payload = {
        "claims": [],
        "verdict": "pass",
        "failure_reason": None,
    }
    client = _mock_openai_client([payload])
    log = _FakeLog()

    cfg = _cfg(checker_model="gpt-4o-mini", writer_model="gpt-4o-mini")
    await fact_check_article(cfg, client, "Body.", _cluster(), log)

    warned = [e for e in log.entries if e[0] == "warn"]
    assert any(
        "fact-checker uses same model as writer" in msg for _, msg, _ in warned
    )


@pytest.mark.asyncio
async def test_source_index_references_cluster_sources_correctly():
    """A supported claim at index N must correspond to the Nth Trend in the cluster."""
    cluster = _cluster()
    assert cluster.sources[0].url == "https://reuters.example/a"
    assert cluster.sources[1].url == "https://bloomberg.example/b"

    payload = {
        "claims": [
            {
                "text": "Reuters reported $1B figure.",
                "supported": True,
                "supporting_quote_from_source": "$1 billion acquisition",
                "source_index": 1,
            },
            {
                "text": "Bloomberg reported Q3 close.",
                "supported": True,
                "supporting_quote_from_source": "deal closes in Q3",
                "source_index": 2,
            },
        ],
        "verdict": "pass",
        "failure_reason": None,
    }
    client = _mock_openai_client([payload])
    log = _FakeLog()

    report = await fact_check_article(_cfg(), client, "Body.", cluster, log)

    by_idx = {c.source_index: c for c in report.claims}
    # Index 1 maps to Reuters, index 2 to Bloomberg.
    assert by_idx[1].text.startswith("Reuters")
    assert by_idx[2].text.startswith("Bloomberg")


@pytest.mark.asyncio
async def test_soft_fail_retry_path_uses_two_consecutive_responses():
    """Simulate the soft_fail-then-pass retry flow by reading two responses."""
    first = {
        "claims": [
            {"text": "Real", "supported": True, "supporting_quote_from_source": "q", "source_index": 1},
            {"text": "Invented detail", "supported": False, "supporting_quote_from_source": None, "source_index": None},
        ],
        "verdict": "fail",
        "failure_reason": "one invented",
    }
    second = {
        "claims": [
            {"text": "Real", "supported": True, "supporting_quote_from_source": "q", "source_index": 1},
        ],
        "verdict": "pass",
        "failure_reason": None,
    }
    client = _mock_openai_client([first, second])
    log = _FakeLog()
    cluster = _cluster()

    r1 = await fact_check_article(_cfg(), client, "Body v1.", cluster, log)
    assert r1.verdict == "soft_fail"

    r2 = await fact_check_article(_cfg(), client, "Body v2.", cluster, log)
    assert r2.verdict == "pass"


def test_summarize_report_is_compact_jsonable():
    r = FactCheckReport(
        verdict="pass",
        failure_reason=None,
        claims=[
            Claim("x", True, "q", 1),
            Claim("y", False, None, None),
        ],
        unsupported=[Claim("y", False, None, None)],
        model_used="gpt-5-mini",
        prompt_tokens=10,
        completion_tokens=5,
        cost_usd=0.000125,
    )
    s = summarize_report(r)
    # Round-trip through json to confirm it's persistable.
    assert json.loads(json.dumps(s)) == s
    assert s["claims_total"] == 2
    assert s["claims_unsupported"] == 1
    assert s["model_used"] == "gpt-5-mini"
