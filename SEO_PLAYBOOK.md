# Techno Times SEO playbook

Every article on this site is engineered to rank. The agent worker enforces
the rules below on every draft, and the site renders the resulting metadata,
markup, and JSON-LD so Google can read it cleanly.

This document is both the spec the agents follow **and** the manual reference
for anyone writing or editing by hand. Read it front-to-back once; from then
on, treat it as the checklist your work has to pass.

---

## 1. The ten rules every article must satisfy

1. **One focus keyword.** A 2–5 word phrase the article is meant to rank for.
   Lowercase, no punctuation. Stored on `articles.focus_keyword`.
2. **4–5 long-tail keywords.** High-intent 3–6 word phrases. Often phrased
   as the question a reader would type. Stored on
   `articles.long_tail_keywords[]`.
3. **One power word in the title.** Must come from the curated news-style
   list (see §6). The title must also contain the focus keyword verbatim.
4. **Slug = focus keyword.** Kebab-case of the focus keyword only, no extra
   words, max 60 characters. Trimmed at a word boundary, never mid-word.
5. **Focus keyword in SEO metadata.** Both the `seo_title` (< 70 chars) and
   `seo_description` (< 160 chars, focus keyword in the first half).
6. **2–3% keyword density.** Across the article body, mentions of the focus
   keyword and long-tail keywords (and natural variants) should account for
   2–3% of total words. For a 1,200-word article that is 24–36 mentions
   combined, distributed naturally — never stuffed.
7. **Inbound links.** Every article auto-links to its category, subcategory,
   author, and topic-cluster pages. The renderer takes care of this; you
   don't have to write them by hand. The six clusters are: **Technology**
   (AI & ML, Software, Hardware & Chips, Internet & Platforms, Cybersecurity),
   **Business** (Startups & Venture, Markets, Media & Streaming,
   Crypto & Fintech), **Science** (Space, Biotech, Climate Science,
   Physics & Math), **Climate** (Clean Energy, Transportation,
   Policy & COP), **Policy** (Antitrust & Regulation, Privacy & Data,
   AI Policy, Geopolitics of Tech), and **Opinion** (Tech Criticism,
   Essays, Letters).
8. **Outbound links.** 2–3 inline markdown links to credible sources inside
   the body. Link text must be substantive (publication name or specific
   phrase), never "click here".
9. **Image alt text contains the focus keyword.** Pipeline enforces this; if
   the writer's alt is missing the keyword it is prepended before publish.
10. **Table of contents + FAQ + about-the-author block.** All three are
    rendered on every article page. The FAQ is structured data (5 Q&A pairs
    from the writer, emitted as `FAQPage` JSON-LD).

---

## 2. How the title is composed

Format: `<power word> <substance including focus keyword>`

Examples:

| ✅ Good | Why |
|---|---|
| **Inside** the **new chip export rules** that just got tighter | power word: *Inside* · focus keyword: *new chip export rules* |
| **Why** **AI coding assistants** are now used daily by most developers | power word: *Why* · focus keyword: *AI coding assistants* |
| **Quietly,** **Starship's first orbital payload** clears NASA's biggest bar | power word: *Quietly* · focus keyword: *Starship's first orbital payload* |

| ❌ Bad | Why |
|---|---|
| The chip export rules just got tighter | no power word |
| Inside the latest tech news | no focus keyword; vague |
| 7 STUNNING facts about AI coding assistants you won't believe | clickbait, not news voice |

The pipeline asserts both the power word presence and the focus keyword
verbatim match before accepting the writer's output.

---

## 3. How the slug is computed

The slug is the focus keyword, kebab-cased, capped at 60 characters,
trimmed at a word boundary.

```
focus_keyword:  "ai chip export rules"
slug:           "ai-chip-export-rules"

focus_keyword:  "starship first orbital payload mission"
slug:           "starship-first-orbital-payload"        ← trimmed at -60
```

Final URL: `https://yourdomain.com/<category>/<slug>` — e.g.
`https://yourdomain.com/policy/ai-chip-export-rules`. Slugs are stable for
the life of the article; living updates do not change the URL.

---

## 4. Keyword density: how the agent hits 2–3% naturally

The writer prompt enforces density indirectly — it asks for a target word
count (1,000–1,500) and explicitly states the math (24–36 keyword mentions
combined for a 1,200-word piece). The way that actually shows up in copy:

- Focus keyword appears in: title, dek, first paragraph, ~3 other paragraphs,
  one H2 subheading, the conclusion, the SEO title, the SEO description, the
  image alt — roughly 9–10 placements.
- Long-tail keywords appear naturally throughout the body — 3–4 of them, one
  or two times each. That's another 5–8 placements.
- Total: 14–18 placements, comfortably in the 2–3% band for a 1,200-word
  article. No need to engineer it line by line.

Density is **not** a hard runtime check (false positives are too easy). It's
a prompt-level instruction. If you want to verify post-hoc, paste the
article through any keyword-density auditor.

---

## 5. Inbound + outbound links

### Inbound (internal) — automatic
`src/lib/articleBody.tsx` runs an auto-linker over every paragraph. It
inserts the first occurrence of each known phrase as a link to:

- `/<category>` — category landing
- `/<category>/<subcategory>` — subcategory page
- `/by/<author>` — author profile
- (Plus the per-article tag chips at the bottom → `/topic/<tag>`)

It is capped at 6 links per article (the SEO sweet spot — more than that
reads as link-stuffing). The article's own category / subcategory / author
are excluded from auto-linking so pages don't link to themselves. There is
nothing for the writer to do here.

### Outbound (external) — writer's job
The writer prompt requires 2–3 inline markdown links to credible sources
inside the body. Markdown like:

```
The [Federal Reserve](https://federalreserve.gov/...) held its
benchmark rate unchanged, the [Wall Street Journal](https://wsj.com/...)
reported.
```

These render through `prose-article a` styles (section-color underline,
nofollow when appropriate). Outbound links signal that the article is built
on real reporting, which is what Google's E-E-A-T scoring wants to see.

---

## 6. The power-word list

Curated for news voice, not listicle clickbait. Single source of truth at
`src/lib/powerWords.ts` (TypeScript) and `agents/technotimes_agents/pipeline.py::POWER_WORDS`
(Python — must stay in sync).

```
Inside, Why, How, Quietly, Suddenly, Just, Now, First, Last, New,
Breaking, Major, Latest, Rare, Defining, Pivotal, Critical, Crucial,
Decisive, Sweeping, Stunning, Sharp, Bold, Hidden, Unfolding,
Surprising, Strategic, Urgent, Quiet, Final, Renewed
```

Adding a power word: edit both lists. There's a test in
`agents/tests/test_seo_rules.py` that guards against degenerate edits.

---

## 7. SEO metadata (`<head>`)

The article page (`src/app/[category]/[slug]/page.tsx::generateMetadata`)
emits:

| Tag | Source |
|---|---|
| `<title>` | `seo_title` (writer-provided, includes focus keyword) |
| `<meta name="description">` | `seo_description` (focus keyword in first half) |
| `<meta name="keywords">` | `focus_keyword` + `long_tail_keywords[]` + `seo_keywords[]`, deduped |
| `<link rel="canonical">` | `/<category>/<slug>` |
| `<meta property="og:*">` | OpenGraph: title, description, type=article, publishedTime, modifiedTime, authors, image |
| `<meta name="twitter:*">` | Twitter card: large summary, site, title, description |

OpenGraph image is generated per-article by `app/[category]/[slug]/opengraph-image.tsx`
using Next's `ImageResponse` — always present, always on-brand.

---

## 8. Structured data (JSON-LD)

Every article page ships **three** JSON-LD blocks in the rendered HTML:

1. `NewsArticle` — the article itself (title, image, dates, author, publisher,
   keywords, articleSection).
2. `BreadcrumbList` — Home › Category › Subcategory › Article. Often surfaces
   as breadcrumb chips in Google results.
3. `FAQPage` — generated automatically when `articles.faq` is non-empty.
   Powers the "People also ask" expandable cards on the SERP.

Plus on author pages: `Person` with `sameAs` social handles. On the site
root: `NewsMediaOrganization`.

If you want to verify, View Page Source on a published article and grep for
`application/ld+json`.

---

## 9. Table of contents

Rendered above the article body by `<TableOfContents>`. Built from:

- Every `## ` H2 heading in the article body (the `renderArticleBody`
  helper slugifies these into stable anchor ids).
- The "Frequently asked questions" section, when present.

The TOC links to in-page anchors via `#id`. Google often inlines these
as "jump to" links in the SERP when the user's query matches a section
title — which is why H2s should describe their section's content honestly.

---

## 10. FAQ block

The writer produces an `faq` array of 3–5 `{ q, a }` pairs as part of its
JSON output. The shape:

```json
[
  { "q": "When do the new chip export rules take effect?",
    "a": "The rules apply 30 days after publication in the Federal Register..." },
  { "q": "Which countries are affected?",
    "a": "The expanded list adds ..." }
]
```

Rules for FAQs:

- Questions read as real Google queries ("Is X legal?", "How much does Y
  cost?", "When does Z take effect?"). They are NOT marketing prompts.
- Answers are 2–4 sentences. Factual. Sourced from the article body — never
  introduce new facts in the FAQ.
- 3–5 entries. More than 5 hurts the SERP rendering.

The FAQ block renders as native `<details>`/`<summary>` for keyboard nav
and assistive tech. The accompanying `FAQPage` JSON-LD is the part Google
actually scrapes.

---

## 11. About-the-author block

Already present at the bottom of every article (`src/app/[category]/[slug]/page.tsx`).
Pulls from the fixed roster in `src/lib/authors.ts`:

- Section-colored initials avatar (or DALL·E portrait if generated)
- Linked name → `/by/<slug>` profile page
- Job title + bio

The author's profile page (`/by/<slug>`) carries `Person` JSON-LD with
`sameAs` pointing at the author's X / LinkedIn / personal site fields,
plus their full article portfolio. This is the E-E-A-T layer:
"Authoritativeness" comes from the named author having a stable, verifiable
identity Google can trust.

---

## 12. Image SEO

| Concern | Implementation |
|---|---|
| Permanent URLs | Every cover image is downloaded + re-hosted in Supabase Storage via `/api/agent/images`. DALL·E URLs expire in ~1h; news-API thumbnails rotate. We hold our own copy. |
| Format negotiation | `next.config.mjs` enables AVIF + WebP; browsers get the smallest format they support. |
| Responsive `srcset` | `<Image>` on the article hero with `sizes="(max-width: 1024px) 100vw, 1280px"`; ArticleCard variants use appropriate `sizes` per slot. |
| Alt text | Writer-supplied; pipeline ensures the focus keyword is present before publish. |
| Credit | `image_credit` + `image_source_url` rendered in the figcaption with a `nofollow` outbound link. AI-generated images carry an explicit "AI-generated illustration" caption. |

---

## 13. How the agent enforces all of this

Workflow per article in `agents/technotimes_agents/pipeline.py`:

1. **Editor agent** picks the topic and may flag it as a continuation
   (`existing_topic_key`) so we update an existing URL instead of creating
   a duplicate.
2. **Writer agent** is prompted with the full SEO contract above. It returns
   structured JSON with `focus_keyword`, `long_tail_keywords`, `power_word`,
   `slug`, `title`, `body`, `seo_title`, `seo_description`, `cover_image_alt`,
   `faq[]`, and all the standard fields.
3. **Post-processing** in `write_article()`:
   - Slug is regenerated from `focus_keyword` if the writer's slug is empty
     or too long.
   - `cover_image_alt` is patched to include the focus keyword if missing.
   - All fields land on the `articles` row via `/api/agent/articles`.
4. **Living updates** preserve the slug + author + `published_at`; only the
   body, dek, image and FAQ change. Story-update timeline gets a new entry.

Schema lives in `supabase/migrations/0005_seo_metadata.sql`. CI test guards
in `agents/tests/test_seo_rules.py` and `tests/unit/powerWords.test.ts`.

---

## 14. Verifying a single article

After publish, open the article and check by hand:

- [ ] URL is `/<category>/<focus-keyword-kebab>`
- [ ] Title contains a power word AND the focus keyword
- [ ] Dek contains the focus keyword (it usually does naturally)
- [ ] TOC appears at the top with at least 2 H2 anchors
- [ ] Body has 1–2 pull quotes (large italic blocks)
- [ ] Body has 2–3 outbound links visible to credible sources
- [ ] FAQ section is at the bottom with 3–5 expandable Q&As
- [ ] About-the-author block is below the body
- [ ] View Source: `<title>` + `<meta name=description>` both include the
      focus keyword; three `application/ld+json` blocks (`NewsArticle`,
      `BreadcrumbList`, `FAQPage`)
- [ ] Cover image: `<img alt>` contains the focus keyword
- [ ] OG image URL (`/<category>/<slug>/opengraph-image`) returns a 1200×630
      PNG with the article title

If any of those fail on a fresh agent-published article, file a bug — the
prompt has drifted.

---

## 15. Pillar pages (evergreen topic guides)

Each subcategory page gets a ~2,000-word reference guide rendered above the
article grid. They are produced by a separate Modal worker
(`weekly_pillar_refresh`) that runs every Monday at 08:00 UTC and rewrites
every one of ~25 pillars in a single run.

Pillars use `gpt-5-mini` (configurable via `PILLAR_MODEL`) rather than the
news writer's model — evergreen reference content doesn't need the
breaking-news judgment, and the cheaper model brings the weekly refresh in
around ~$2–$3 total.

A pillar is the article SEO contract (focus keyword + long-tail keywords
+ power word) plus extra structured sections:

- `overview` — one-paragraph plain-language definition
- `why_it_matters` — 2–3 sentences for a non-expert
- `key_terms` — 5–8 glossary entries
- `timeline` — 4–8 chronological events
- `faq` — 5–7 Q&A pairs (rendered as `FAQPage` JSON-LD on the page)
- `related_subcategories` — 2–4 sibling-subcategory slugs for crosslinking

Pillars live at the existing `/<category>/<subcategory>` URL — one
canonical page per topic, never two. The article grid still appears below.
This is the deliberate SEO move: concentrate link equity on a single URL
that targets the head term while individual articles attack the long tail.

Refresh by hand or test the prompt:
```bash
modal run modal_app.py::manual_pillar_refresh
# or, for a free dry-run:
DRY_RUN=1 python -m technotimes_agents.pillar_pipeline
```

Schema: `supabase/migrations/0006_subcategory_pillars.sql`.
Component: `src/components/SubcategoryPillar.tsx`.
Ingest endpoint: `POST /api/agent/pillars`.

## 16. What still isn't automated

- **Affiliate links** — not in scope for v1.
- **Internal-link quality auditing** — auto-linker inserts cluster links, but
  a human editor could improve placement on top stories.
- **Cookie consent banner** — explicit v1 choice; disclosure-only privacy
  posture (see `/privacy`).
- **Semantic / vector search** — `/search` runs on Postgres FTS
  (websearch_to_tsquery + GIN, weighted title/dek/excerpt), which is fine
  to ~100k articles. A pgvector layer for synonym/intent matching is a
  future move, not a v1 need.
