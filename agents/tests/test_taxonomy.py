"""The Python taxonomy mirror MUST line up with the TypeScript source.

If these tests fail, sync agents/technotimes_agents/taxonomy.py against
src/lib/taxonomy.ts and src/lib/authors.ts.
"""
from __future__ import annotations

from technotimes_agents.taxonomy import (
    AUTHORS,
    CATEGORIES,
    all_pairs,
    find_category,
    select_author,
)


def test_six_pillars():
    assert len(CATEGORIES) == 6


def test_unique_slugs():
    slugs = [c.slug for c in CATEGORIES]
    assert len(set(slugs)) == len(slugs)


def test_each_pillar_has_subs():
    for c in CATEGORIES:
        assert len(c.subcategories) >= 3
        sub_slugs = [s.slug for s in c.subcategories]
        assert len(set(sub_slugs)) == len(sub_slugs)


def test_find_category_roundtrip():
    assert find_category("technology").name == "Technology"
    assert find_category("nope") is None


def test_all_pairs_covers_every_pillar_and_sub():
    pairs = all_pairs()
    expected = sum(1 + len(c.subcategories) for c in CATEGORIES)
    assert len(pairs) == expected


def test_authors_have_unique_slugs():
    assert len({a.slug for a in AUTHORS}) == len(AUTHORS)


def test_authors_beat_references_real_categories():
    known = {c.slug for c in CATEGORIES}
    for a in AUTHORS:
        for b in a.beat:
            assert b in known


def test_select_author_prefers_sub_beat():
    a = select_author("technology", "ai-and-ml")
    assert a.slug == "mira-chen"


def test_select_author_falls_back_to_category():
    a = select_author("climate", None)
    assert a.slug == "marcus-aoki"


def test_select_author_final_fallback():
    a = select_author("nothing", "nothing")
    assert a.slug == "elena-kovac"
