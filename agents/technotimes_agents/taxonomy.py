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
    Category("world", "World", (
        Subcategory("americas", "Americas"),
        Subcategory("europe", "Europe"),
        Subcategory("asia-pacific", "Asia Pacific"),
        Subcategory("africa", "Africa"),
        Subcategory("middle-east", "Middle East"),
        Subcategory("conflicts", "Conflicts"),
    )),
    Category("us", "U.S.", (
        Subcategory("politics", "Politics"),
        Subcategory("education", "Education"),
        Subcategory("justice", "Justice"),
        Subcategory("immigration", "Immigration"),
        Subcategory("race", "Race"),
        Subcategory("regions", "Regions"),
    )),
    Category("politics", "Politics", (
        Subcategory("elections", "Elections"),
        Subcategory("white-house", "White House"),
        Subcategory("congress", "Congress"),
        Subcategory("supreme-court", "Supreme Court"),
        Subcategory("policy", "Policy"),
        Subcategory("foreign-policy", "Foreign Policy"),
    )),
    Category("business", "Business", (
        Subcategory("markets", "Markets"),
        Subcategory("economy", "Economy"),
        Subcategory("dealbook", "DealBook"),
        Subcategory("companies", "Companies"),
        Subcategory("workplace", "Workplace"),
        Subcategory("personal-finance", "Personal Finance"),
    )),
    Category("technology", "Technology", (
        Subcategory("artificial-intelligence", "Artificial Intelligence"),
        Subcategory("cybersecurity", "Cybersecurity"),
        Subcategory("internet", "Internet"),
        Subcategory("hardware", "Hardware"),
        Subcategory("software", "Software"),
        Subcategory("big-tech", "Big Tech"),
    )),
    Category("science", "Science", (
        Subcategory("space", "Space"),
        Subcategory("research", "Research"),
        Subcategory("archaeology", "Archaeology"),
        Subcategory("robotics", "Robotics"),
        Subcategory("genetics", "Genetics"),
    )),
    Category("health", "Health", (
        Subcategory("public-health", "Public Health"),
        Subcategory("medicine", "Medicine"),
        Subcategory("mental-health", "Mental Health"),
        Subcategory("wellness", "Wellness"),
        Subcategory("aging", "Aging"),
    )),
    Category("climate", "Climate", (
        Subcategory("crisis", "Climate Crisis"),
        Subcategory("energy", "Energy"),
        Subcategory("environment", "Environment"),
        Subcategory("animals", "Animals"),
        Subcategory("weather", "Weather"),
    )),
    Category("sports", "Sports", (
        Subcategory("soccer", "Soccer"),
        Subcategory("football", "Football"),
        Subcategory("basketball", "Basketball"),
        Subcategory("baseball", "Baseball"),
        Subcategory("tennis", "Tennis"),
        Subcategory("olympics", "Olympics"),
        Subcategory("auto-racing", "Auto Racing"),
    )),
    Category("arts", "Arts", (
        Subcategory("film", "Film"),
        Subcategory("television", "Television"),
        Subcategory("music", "Music"),
        Subcategory("books", "Books"),
        Subcategory("theater", "Theater"),
        Subcategory("design", "Design"),
    )),
    Category("culture", "Culture", (
        Subcategory("internet-culture", "Internet Culture"),
        Subcategory("celebrity", "Celebrity"),
        Subcategory("style", "Style"),
        Subcategory("identity", "Identity"),
    )),
    Category("lifestyle", "Lifestyle", (
        Subcategory("relationships", "Relationships"),
        Subcategory("parenting", "Parenting"),
        Subcategory("home", "Home"),
        Subcategory("beauty", "Beauty"),
    )),
    Category("food", "Food", (
        Subcategory("restaurants", "Restaurants"),
        Subcategory("recipes", "Recipes"),
        Subcategory("drinks", "Drinks"),
        Subcategory("industry", "Industry"),
    )),
    Category("travel", "Travel", (
        Subcategory("destinations", "Destinations"),
        Subcategory("tips", "Tips"),
        Subcategory("budget", "Budget"),
        Subcategory("luxury", "Luxury"),
        Subcategory("adventure", "Adventure"),
    )),
    Category("real-estate", "Real Estate", (
        Subcategory("markets", "Markets"),
        Subcategory("homes", "Homes"),
        Subcategory("renting", "Renting"),
        Subcategory("buying", "Buying"),
        Subcategory("commercial", "Commercial"),
    )),
    Category("opinion", "Opinion", (
        Subcategory("editorials", "Editorials"),
        Subcategory("guest-essays", "Guest Essays"),
        Subcategory("columnists", "Columnists"),
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
           ("technology",), ("artificial-intelligence", "software", "big-tech")),
    Author("jordan-park", "Jordan Park", "National Security Reporter",
           "Jordan Park reports on national security, the Pentagon, and the intersection of statecraft and technology.",
           ("politics", "us", "world"), ("foreign-policy", "white-house", "conflicts")),
    Author("anya-patel", "Anya Patel", "Science Correspondent",
           "Anya Patel covers space, robotics, and the science that shapes the world beyond the headlines.",
           ("science",), ("space", "robotics", "research")),
    Author("sam-reyes", "Sam Reyes", "Markets Reporter",
           "Sam Reyes writes about global markets, the macro economy, and the stories behind the numbers.",
           ("business",), ("markets", "economy", "dealbook")),
    Author("lucas-brandt", "Lucas Brandt", "Cybersecurity Reporter",
           "Lucas Brandt covers cyberattacks, vulnerabilities, and the contest between defenders and the people trying to break in.",
           ("technology", "us"), ("cybersecurity", "justice")),
    Author("hanna-mueller", "Hanna Mueller", "Europe Correspondent",
           "Hanna Mueller reports from across Europe on politics, regulation, and the continent's place in a shifting world.",
           ("world", "politics"), ("europe", "foreign-policy")),
    Author("yumi-tanaka", "Yumi Tanaka", "Asia Pacific Correspondent",
           "Yumi Tanaka covers the Asia Pacific, with a focus on the region's economies and the technology companies driving them.",
           ("world", "business", "technology"), ("asia-pacific",)),
    Author("marcus-aoki", "Marcus Aoki", "Climate Reporter",
           "Marcus Aoki writes about the climate crisis, the energy transition, and the people on the front lines of both.",
           ("climate", "science"), ("crisis", "energy", "environment")),
    Author("sofia-ruiz", "Sofia Ruiz", "Health Reporter",
           "Sofia Ruiz covers public health, medicine, and the science of how people stay well.",
           ("health", "science"), ("public-health", "medicine", "wellness")),
    Author("theo-kane", "Theo Kane", "Senior Sports Writer",
           "Theo Kane covers the leagues, athletes, and big moments that move the sports world.",
           ("sports",)),
    Author("beatrice-lavigne", "Beatrice Lavigne", "Arts & Culture Critic",
           "Beatrice Lavigne writes about film, television, and the wider culture they reflect.",
           ("arts", "culture"), ("film", "television", "celebrity")),
    Author("devin-okafor", "Devin Okafor", "Internet Culture Reporter",
           "Devin Okafor covers the always-online world of memes, creators, and the platforms they live on.",
           ("culture", "technology"), ("internet-culture", "internet")),
    Author("priya-shah", "Priya Shah", "Software & Developer Reporter",
           "Priya Shah covers software, open source, and the people building the tools the internet runs on.",
           ("technology",), ("software", "internet")),
    Author("noah-whitfield", "Noah Whitfield", "Real Estate Reporter",
           "Noah Whitfield writes about housing markets, the people buying and renting in them, and the policies that shape both.",
           ("real-estate", "business")),
    Author("elena-kovac", "Elena Kovac", "Editorial Board Member",
           "Elena Kovac writes for the Techno Times editorial board on global affairs, the economy, and the tensions between them.",
           ("opinion", "world", "business")),
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
