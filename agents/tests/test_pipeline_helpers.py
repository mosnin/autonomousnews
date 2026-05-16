"""Unit tests for the pure helper functions inside the pipeline module."""
from __future__ import annotations

from technotimes_agents.pipeline import (
    DALLE_USD_PER_IMAGE,
    estimate_cost,
    slugify,
    topic_key,
)


def test_slugify_basic():
    assert slugify("OpenAI Launches X!!") == "openai-launches-x"


def test_slugify_collapses_separators_and_trims():
    assert slugify("---weird & wonky___title---").startswith("weird-wonky-title")


def test_slugify_caps_length():
    long = "x" * 200
    assert len(slugify(long)) <= 80


def test_slugify_fallback_for_empty():
    assert slugify("") == "story"
    assert slugify("###") == "story"


def test_topic_key_is_stable():
    a = topic_key("Some Headline", "technology")
    b = topic_key("some headline", "technology")
    assert a == b  # case-insensitive


def test_topic_key_includes_category_slug():
    k = topic_key("X", "politics")
    assert k.startswith("politics-")


def test_estimate_cost_gpt4o_mini_known_pricing():
    # 1M input tokens at $0.15, 1M output at $0.60 -> $0.75 total for 1M of each.
    cost = estimate_cost("gpt-4o-mini", 1_000_000, 1_000_000)
    assert abs(cost - 0.75) < 1e-9


def test_estimate_cost_unknown_model_uses_fallback():
    cost = estimate_cost("totally-fake-model", 1_000_000, 1_000_000)
    # Fallback is 1 + 3 per 1M
    assert abs(cost - 4.0) < 1e-9


def test_estimate_cost_is_zero_for_no_tokens():
    assert estimate_cost("gpt-4o", 0, 0) == 0


def test_dalle_pricing_is_documented():
    assert DALLE_USD_PER_IMAGE == 0.040
