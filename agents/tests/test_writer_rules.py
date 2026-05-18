"""Lock in the writer's reporting contract.

The point of these tests is the prompt itself: if anyone weakens the
"REPORTER not creative writer" framing or the no-invented-URLs rule, the
test suite must fail. The actual model output is impossible to test
without spending tokens, but we can pin the prompt's intent.
"""
from __future__ import annotations

from technotimes_agents.pipeline import WRITER_SYSTEM, WRITER_UPDATE_SYSTEM


def test_writer_prompt_calls_writer_a_reporter():
    assert "REPORTER" in WRITER_SYSTEM


def test_writer_prompt_forbids_inventing_urls():
    # The exact rule wording can drift, but it must contain a clear ban on
    # URL invention. We check for the keyword + a forbidding verb in close
    # proximity so a non-trivial weakening trips the assertion.
    body = WRITER_SYSTEM
    assert "NEVER invent URLs" in body, (
        "WRITER_SYSTEM must contain the literal phrase 'NEVER invent URLs'"
    )


def test_writer_prompt_requires_attribution():
    # Rule #1 is the attribution rule; it must reference the supported
    # attribution patterns.
    body = WRITER_SYSTEM
    assert "According to <Publication>" in body
    assert "attributable to a specific source" in body


def test_writer_prompt_caps_length_at_1200_words():
    # We deliberately tightened from 1,000-1,500 to 800-1,200 so the writer
    # has less room to drift past what sources support.
    assert "800-1,200 words" in WRITER_SYSTEM


def test_writer_prompt_keeps_seo_contract_below_reporting():
    # SEO rules are downstream of accuracy. The header must sit AFTER the
    # absolute rules.
    body = WRITER_SYSTEM
    seo_idx = body.find("SEO REQUIREMENTS")
    rules_idx = body.find("ABSOLUTE RULES")
    assert rules_idx != -1 and seo_idx != -1
    assert rules_idx < seo_idx


def test_writer_update_prompt_inherits_reporter_rules():
    # The living-article update path uses WRITER_UPDATE_SYSTEM which is
    # built on top of WRITER_SYSTEM — confirm the reporter contract
    # carries through.
    assert "REPORTER" in WRITER_UPDATE_SYSTEM
    assert "NEVER invent URLs" in WRITER_UPDATE_SYSTEM
