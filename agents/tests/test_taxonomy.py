"""The Python taxonomy mirror MUST line up with the TypeScript source.

If these tests fail, sync agents/technotimes_agents/taxonomy.py against
src/lib/taxonomy.ts and src/lib/authors.ts.
"""
from __future__ import annotations

from technotimes_agents.taxonomy import (
    CATEGORIES,
    ORG_AUTHOR_NAME,
    ORG_AUTHOR_SLUG,
    ORG_AUTHOR_TITLE,
    all_pairs,
    find_category,
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


def test_org_byline_constants():
    """No fictional personas: a single org byline ships on every article."""
    assert ORG_AUTHOR_NAME == "Techno Times Agents"
    assert ORG_AUTHOR_SLUG == "techno-times-agents"
    assert ORG_AUTHOR_TITLE


def test_no_fictional_roster_remains():
    import technotimes_agents.taxonomy as tax
    assert not hasattr(tax, "AUTHORS")
    assert not hasattr(tax, "select_author")
