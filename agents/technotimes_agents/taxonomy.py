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


@dataclass(frozen=True)
class Author:
    slug: str
    name: str
    title: str
    bio: str
    beat: tuple[str, ...]
    sub_beat: tuple[str, ...] = ()


AUTHORS: tuple[Author, ...] = (
    Author("mira-chen", "Mira Chen", "Senior Technology Correspondent",
           "Mira Chen covers artificial intelligence and the platforms reshaping how we work.",
           ("technology",), ("ai-and-ml", "software", "internet-and-platforms")),
    Author("jordan-park", "Jordan Park", "Tech Policy Reporter",
           "Jordan Park reports on national security, export controls, and the intersection of statecraft and technology.",
           ("policy",), ("geopolitics-of-tech", "ai-policy")),
    Author("anya-patel", "Anya Patel", "Science Correspondent",
           "Anya Patel covers space, biotech, and the science that shapes the world beyond the headlines.",
           ("science",), ("space", "biotech", "physics-and-math")),
    Author("sam-reyes", "Sam Reyes", "Markets Reporter",
           "Sam Reyes writes about global markets, the macro economy, and the stories behind the numbers.",
           ("business",), ("markets", "startups-and-venture", "crypto-and-fintech")),
    Author("lucas-brandt", "Lucas Brandt", "Cybersecurity Reporter",
           "Lucas Brandt covers cyberattacks, vulnerabilities, and the contest between defenders and the people trying to break in.",
           ("technology", "policy"), ("cybersecurity", "privacy-and-data")),
    Author("hanna-mueller", "Hanna Mueller", "Policy Correspondent",
           "Hanna Mueller reports on antitrust, platform regulation, and the rules shaping the technology sector.",
           ("policy", "business"), ("antitrust-and-regulation", "media-and-streaming")),
    Author("yumi-tanaka", "Yumi Tanaka", "Asia Tech Correspondent",
           "Yumi Tanaka covers the technology companies and supply chains of the Asia Pacific.",
           ("technology", "business"), ("hardware-and-chips",)),
    Author("marcus-aoki", "Marcus Aoki", "Climate Reporter",
           "Marcus Aoki writes about clean energy, electric transport, and the people on the front lines of the transition.",
           ("climate", "science"), ("clean-energy", "transportation", "climate-science")),
    Author("sofia-ruiz", "Sofia Ruiz", "Biotech Reporter",
           "Sofia Ruiz covers genetics, drug development, and the science of how people stay well.",
           ("science",), ("biotech",)),
    Author("theo-kane", "Theo Kane", "Media & Streaming Reporter",
           "Theo Kane covers the streaming services, studios, and the business of digital media.",
           ("business",), ("media-and-streaming",)),
    Author("beatrice-lavigne", "Beatrice Lavigne", "Critic at Large",
           "Beatrice Lavigne writes essays and criticism on the technology industry and the products it ships.",
           ("opinion",), ("tech-criticism", "essays")),
    Author("devin-okafor", "Devin Okafor", "Internet Reporter",
           "Devin Okafor covers the platforms, creators, and online life that shape how the web is lived.",
           ("technology",), ("internet-and-platforms",)),
    Author("priya-shah", "Priya Shah", "Software & Developer Reporter",
           "Priya Shah covers software, open source, and the people building the tools the internet runs on.",
           ("technology",), ("software", "ai-and-ml")),
    Author("noah-whitfield", "Noah Whitfield", "Fintech Reporter",
           "Noah Whitfield writes about payments, digital assets, and the businesses rewiring how money moves.",
           ("business",), ("crypto-and-fintech",)),
    Author("elena-kovac", "Elena Kovac", "Editorial Board Member",
           "Elena Kovac writes for the Techno Times editorial board on the technology industry and its consequences.",
           ("opinion",), ("essays", "letters")),
)


def select_author(category_slug: str, subcategory_slug: str | None) -> Author:
    sub_match = [
        a for a in AUTHORS
        if category_slug in a.beat
        and subcategory_slug is not None
        and subcategory_slug in a.sub_beat
    ]
    if sub_match:
        return sub_match[0]
    cat_match = [a for a in AUTHORS if category_slug in a.beat]
    if cat_match:
        return cat_match[0]
    return AUTHORS[-1]
