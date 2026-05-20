import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { EDITOR } from "@/lib/authors";
import { CATEGORIES } from "@/lib/taxonomy";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const SOURCE_REPO_URL =
  process.env.NEXT_PUBLIC_SOURCE_REPO_URL ??
  "https://github.com/yourorg/technotimes";

export const metadata: Metadata = {
  title: "How the newsroom works",
  description: `Live transparency stats for ${SITE.name}: agent runs, fact-check pass rate, operating cost and the editor on duty.`,
  alternates: { canonical: "/agents" },
};

type Stats = {
  runs24h: number;
  articles24h: number;
  factCheckPassRate: number | null;
  cost24h: number;
};

type CategoryUpdate = {
  slug: string;
  name: string;
  lastUpdated: string | null;
};

// Pull last-24h pipeline stats from agent_runs + articles + audit_reports.
// Runs server-side via the admin client; the page itself is public.
async function loadStats(): Promise<{
  stats: Stats;
  categories: CategoryUpdate[];
}> {
  const emptyStats: Stats = {
    runs24h: 0,
    articles24h: 0,
    factCheckPassRate: null,
    cost24h: 0,
  };
  const emptyCategories: CategoryUpdate[] = CATEGORIES.map((c) => ({
    slug: c.slug,
    name: c.name,
    lastUpdated: null,
  }));

  const supabase = getSupabaseAdmin();
  if (!supabase) return { stats: emptyStats, categories: emptyCategories };

  const since = new Date(Date.now() - 24 * 3600_000).toISOString();

  const [runs, articleCount, audits, latestByCat] = await Promise.all([
    supabase
      .from("agent_runs")
      .select("articles_created, cost_usd, status, started_at")
      .gte("started_at", since),
    supabase
      .from("articles")
      .select("id", { head: true, count: "exact" })
      .eq("status", "published")
      .gte("published_at", since),
    supabase
      .from("audit_reports")
      .select("recommendation")
      .gte("audited_at", since),
    supabase
      .from("articles")
      .select("category_slug, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(500),
  ]);

  const runRows = (runs.data ?? []) as Array<{
    articles_created: number | null;
    cost_usd: number | string | null;
    status: string;
    started_at: string;
  }>;
  const cost24h = runRows.reduce((acc, r) => acc + Number(r.cost_usd ?? 0), 0);

  const auditRows = (audits.data ?? []) as Array<{ recommendation: string }>;
  const factCheckPassRate =
    auditRows.length > 0
      ? auditRows.filter((a) => a.recommendation === "keep").length /
        auditRows.length
      : null;

  // Most recent publish time per category.
  const latestRows = (latestByCat.data ?? []) as Array<{
    category_slug: string;
    published_at: string | null;
  }>;
  const lastByCat = new Map<string, string>();
  for (const r of latestRows) {
    if (!r.published_at) continue;
    const existing = lastByCat.get(r.category_slug);
    if (!existing || r.published_at > existing) {
      lastByCat.set(r.category_slug, r.published_at);
    }
  }

  return {
    stats: {
      runs24h: runRows.length,
      articles24h: articleCount.count ?? 0,
      factCheckPassRate,
      cost24h,
    },
    categories: CATEGORIES.map((c) => ({
      slug: c.slug,
      name: c.name,
      lastUpdated: lastByCat.get(c.slug) ?? null,
    })),
  };
}

function relativeTime(iso: string | null): string {
  if (!iso) return "no articles yet";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-rule bg-paper p-5">
      <div className="headline text-3xl md:text-4xl tabular-nums">{value}</div>
      <div className="kicker text-muted mt-1">{label}</div>
    </div>
  );
}

export default async function AgentsPage() {
  const { stats, categories } = await loadStats();

  return (
    <article className="max-w-content mx-auto px-4 md:px-8 pt-12 pb-16">
      <header className="max-w-3xl mb-10">
        <div className="section-ribbon" />
        <div className="kicker text-muted mb-2">Transparency</div>
        <h1 className="headline text-4xl md:text-6xl mb-4">
          How this newsroom works
        </h1>
        <p className="dek text-lg md:text-xl">
          Every article on {SITE.name} is researched and drafted by AI agents
          from primary sources, fact-checked by an independent AI, and surfaced
          for human editor review. The operator on duty is {EDITOR.name}.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="kicker mb-4">Last 24 hours</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Agent runs" value={String(stats.runs24h)} />
          <Stat label="Articles published" value={String(stats.articles24h)} />
          <Stat
            label="Fact-check pass rate"
            value={
              stats.factCheckPassRate == null
                ? "—"
                : `${Math.round(stats.factCheckPassRate * 100)}%`
            }
          />
          <Stat label="Operating cost" value={`$${stats.cost24h.toFixed(2)}`} />
        </div>
        <p className="text-xs text-muted mt-3 font-sans">
          Fact-check pass rate is the share of audited articles the independent
          auditor recommended keeping unchanged. A dash means no audits have run
          in the window.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="kicker mb-4">The six desks</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/${c.slug}`}
              className="story-link block border border-rule bg-paper p-4 hover:bg-wash"
            >
              <div className="headline text-lg">{c.name}</div>
              <div className="byline text-[11px] uppercase tracking-kicker text-muted mt-1">
                Updated {relativeTime(c.lastUpdated)}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-12 max-w-3xl prose-article">
        <h2>What the agents do</h2>
        <p>
          A pipeline of autonomous agents reads primary sources — SEC filings,
          arXiv papers, reputable news APIs and the live web — recognises the
          stories that look like news, and drafts each article with inline
          source citations. An independent fact-checking agent re-reads every
          draft against those sources before it is allowed into the publish
          queue. A nightly auditor re-checks a sample of already-published
          articles for drift.
        </p>
        <h2>Where the human fits</h2>
        <p>
          {EDITOR.name}, {EDITOR.title}, reviews the agent audit queue and signs
          off on what is published. No article carries a fictional reporter
          persona; the byline on every story reads{" "}
          <em>Reported by Techno Times Agents · Edited by {EDITOR.name}</em>.
        </p>
        <h2>Open source</h2>
        <p>
          The entire system — the agents, the fact-checker, the database schema
          and this frontend — is open source. Read the code, file an issue, or
          run your own instance:
        </p>
      </section>

      <section className="mb-4">
        <a
          href={SOURCE_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block border border-ink bg-ink text-paper px-5 py-3 font-sans uppercase tracking-kicker text-sm hover:bg-paper hover:text-ink transition-colors"
        >
          View the source repository ↗
        </a>
      </section>
    </article>
  );
}
