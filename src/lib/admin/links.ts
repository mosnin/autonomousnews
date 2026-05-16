import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Internal-link target regex.
// Matches the auto-linker output: ](/<category>/<subcategory>/<slug>)
// from a markdown link of the form `[phrase](/cat/sub/slug)`.
// The capture group we care about is group 3 (the article slug).
//
// TODO: When the corpus exceeds ~2k published articles, this full-body scan
// will start dominating /admin/links load time. The future move is a
// denormalized `inbound_link_count` column on articles, maintained by a
// trigger on UPDATE OF body (or by the agent worker writing the count when
// it publishes). For now (~hundreds of articles) the in-memory tally is fine.
const INTERNAL_LINK_RE =
  /\]\(\/([a-z0-9-]+)\/([a-z0-9-]+)\/([a-z0-9-]+)\)/g;

export type ArticleLinkRow = {
  id: string;
  slug: string;
  title: string;
  category_slug: string;
  subcategory_slug: string | null;
  published_at: string | null;
  body: string;
};

export type RankedArticle = {
  id: string;
  slug: string;
  title: string;
  category_slug: string;
  subcategory_slug: string | null;
  published_at: string | null;
  inboundCount: number;
};

export type LinkReport = {
  topInbound: RankedArticle[];
  orphans: RankedArticle[];
  overLinked: RankedArticle[];
  // Diagnostics so the dashboard can show context.
  totalArticles: number;
  totalInternalLinks: number;
  // The 95th-percentile threshold used to classify over-linked rows.
  overLinkedThreshold: number;
};

/**
 * Count outbound internal links in a markdown body, returning the article
 * slugs that each link points at.
 *
 * Exported for unit testing.
 */
export function extractLinkTargetSlugs(body: string | null | undefined): string[] {
  if (!body) return [];
  const slugs: string[] = [];
  // Reset the regex's lastIndex by re-creating the iterator each call so
  // calls are stateless / safe to invoke concurrently.
  const re = new RegExp(INTERNAL_LINK_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    // m[3] is the article slug segment.
    slugs.push(m[3]);
  }
  return slugs;
}

/**
 * Compute the inbound-link tally across all *published* articles and slice
 * it three ways: top 20 inbound, orphans (zero inbound), and over-linked
 * (top 5% by inbound — strictly above the 95th percentile).
 *
 * Self-links (a body linking to its own slug) are excluded from the tally
 * since the linker's `excludeHrefs` already prevents them in normal output,
 * but defensively dropping them keeps a stray edge case from inflating
 * counts.
 */
export async function getLinkReport(): Promise<LinkReport> {
  const empty: LinkReport = {
    topInbound: [],
    orphans: [],
    overLinked: [],
    totalArticles: 0,
    totalInternalLinks: 0,
    overLinkedThreshold: 0,
  };

  const supabase = getSupabaseAdmin();
  if (!supabase) return empty;

  // Pull only published articles. We need the full body to scan for links,
  // so this is the slow part of the request — see TODO above.
  const { data, error } = await supabase
    .from("articles")
    .select("id, slug, title, category_slug, subcategory_slug, published_at, body")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error || !data) return empty;
  const rows = data as unknown as ArticleLinkRow[];

  // Tally inbound link counts, keyed by the target article slug. Slugs are
  // unique in this app (the public route is `/<category>/<slug>`), so a
  // single Map keyed by slug is sufficient.
  const inbound = new Map<string, number>();
  let totalInternalLinks = 0;
  for (const row of rows) {
    const targets = extractLinkTargetSlugs(row.body);
    for (const targetSlug of targets) {
      if (targetSlug === row.slug) continue; // defensive: skip self-links
      inbound.set(targetSlug, (inbound.get(targetSlug) ?? 0) + 1);
      totalInternalLinks += 1;
    }
  }

  // Annotate every row with its inbound count.
  const ranked: RankedArticle[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    category_slug: r.category_slug,
    subcategory_slug: r.subcategory_slug,
    published_at: r.published_at,
    inboundCount: inbound.get(r.slug) ?? 0,
  }));

  // Top 20 — descending by count, then by recency to break ties.
  const topInbound = [...ranked]
    .sort((a, b) => {
      if (b.inboundCount !== a.inboundCount)
        return b.inboundCount - a.inboundCount;
      const ta = a.published_at ? Date.parse(a.published_at) : 0;
      const tb = b.published_at ? Date.parse(b.published_at) : 0;
      return tb - ta;
    })
    .slice(0, 20);

  // Orphans — zero inbound, sorted newest first (operators care most about
  // recently-published orphans they can still rescue with a regen).
  const orphans = ranked
    .filter((a) => a.inboundCount === 0)
    .sort((a, b) => {
      const ta = a.published_at ? Date.parse(a.published_at) : 0;
      const tb = b.published_at ? Date.parse(b.published_at) : 0;
      return tb - ta;
    });

  // Over-linked — strictly above the 95th percentile of inbound counts.
  // We compute the threshold over *all* published articles (including
  // zeroes) so the tail captures the heavy-hitter outliers, then keep
  // anything above it.
  const overLinkedThreshold = percentile(
    ranked.map((a) => a.inboundCount),
    0.95
  );
  const overLinked = ranked
    .filter((a) => a.inboundCount > overLinkedThreshold)
    .sort((a, b) => b.inboundCount - a.inboundCount);

  return {
    topInbound,
    orphans,
    overLinked,
    totalArticles: rows.length,
    totalInternalLinks,
    overLinkedThreshold,
  };
}

/**
 * Nearest-rank percentile. p in [0, 1]. Returns 0 for an empty input.
 * Exported for unit testing.
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  // Nearest-rank: rank = ceil(p * N), 1-indexed.
  const rank = Math.max(1, Math.ceil(p * sorted.length));
  return sorted[Math.min(rank, sorted.length) - 1];
}
