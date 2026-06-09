"""Mirror of src/lib/taxonomy.ts and src/lib/authors.ts.

Kept in sync by hand; lightweight enough that a script isn't worth it yet.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Subcategory:
    slug: str
    name: str


@dataclass(frozen=True)
class Category:
    slug: str
    name: str
    subcategories: tuple[Subcategory, ...]


CATEGORIES: tuple[Category, ...] = (
    Category("technology", "Technology", (
        Subcategory("ai-and-ml", "AI & ML"),
        Subcategory("software", "Software"),
        Subcategory("hardware-and-chips", "Hardware & Chips"),
        Subcategory("internet-and-platforms", "Internet & Platforms"),
        Subcategory("cybersecurity", "Cybersecurity"),
    )),
    Category("business", "Business", (
        Subcategory("startups-and-venture", "Startups & Venture"),
        Subcategory("markets", "Markets"),
        Subcategory("media-and-streaming", "Media & Streaming"),
        Subcategory("crypto-and-fintech", "Crypto & Fintech"),
    )),
    Category("science", "Science", (
        Subcategory("space", "Space"),
        Subcategory("biotech", "Biotech"),
        Subcategory("climate-science", "Climate Science"),
        Subcategory("physics-and-math", "Physics & Math"),
    )),
    Category("climate", "Climate", (
        Subcategory("clean-energy", "Clean Energy"),
        Subcategory("transportation", "Transportation"),
        Subcategory("policy-and-cop", "Policy & COP"),
    )),
    Category("policy", "Policy", (
        Subcategory("antitrust-and-regulation", "Antitrust & Regulation"),
        Subcategory("privacy-and-data", "Privacy & Data"),
        Subcategory("ai-policy", "AI Policy"),
        Subcategory("geopolitics-of-tech", "Geopolitics of Tech"),
    )),
    Category("opinion", "Opinion", (
        Subcategory("tech-criticism", "Tech Criticism"),
        Subcategory("essays", "Essays"),
        Subcategory("letters", "Letters"),
    )),
)


CATEGORY_BY_SLUG = {c.slug: c for c in CATEGORIES}


def find_category(slug: str) -> Category | None:
    return CATEGORY_BY_SLUG.get(slug)


def all_pairs() -> list[tuple[str, str | None]]:
    """All (category_slug, subcategory_slug) routing targets."""
    pairs: list[tuple[str, str | None]] = []
    for c in CATEGORIES:
        pairs.append((c.slug, None))
        for s in c.subcategories:
            pairs.append((c.slug, s.slug))
    return pairs


# The organization byline. There are no fictional reporter personas:
# every article publishes under the org name, with the human editor
# identified separately on the frontend (src/lib/authors.ts EDITOR).
ORG_AUTHOR_NAME = "Techno Times Agents"
ORG_AUTHOR_SLUG = "techno-times-agents"
ORG_AUTHOR_TITLE = "Reporter"
