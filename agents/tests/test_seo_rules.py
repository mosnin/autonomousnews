"""SEO rules that EVERY agent article must satisfy.

If the writer prompt drifts, these tests catch it before we ship.
"""
from __future__ import annotations

import re

from technotimes_agents.pipeline import POWER_WORDS, slugify


# --- slug rules ----------------------------------------------------------
def test_slug_is_short_and_kebab():
    s = slugify("AI Chip Export Rules That Just Got Tighter")
    assert len(s) <= 60
    assert re.fullmatch(r"[a-z0-9-]+", s)
    assert not s.startswith("-")
    assert not s.endswith("-")


def test_slug_trims_at_word_boundary():
    long = "a" * 30 + " " + "b" * 30 + " " + "c" * 30
    s = slugify(long)
    # Must not end mid-word with a stray hyphen
    assert not s.endswith("-")
    # Must respect max_len
    assert len(s) <= 60


def test_slug_from_focus_keyword_only():
    # 'ai chip export rules' -> 'ai-chip-export-rules'
    assert slugify("ai chip export rules") == "ai-chip-export-rules"


def test_slug_falls_back_for_unicode_only_input():
    assert slugify("¿¡") == "story"


# --- power words ---------------------------------------------------------
def test_power_words_present_and_de_duped():
    assert len(POWER_WORDS) >= 25
    lowered = [w.lower() for w in POWER_WORDS]
    assert len(set(lowered)) == len(POWER_WORDS)


def test_at_least_one_power_word_starts_with_capital():
    # The writer prompt expects them in Title Case
    assert all(w[0].isupper() for w in POWER_WORDS)
