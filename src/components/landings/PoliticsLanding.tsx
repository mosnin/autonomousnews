import Link from "next/link";
import type { ArticleSummary } from "@/lib/articles";
import { findCategory } from "@/lib/taxonomy";
import ArticleCard from "@/components/ArticleCard";
import AdSlot from "@/components/AdSlot";
import { sectionColor } from "@/lib/sectionColors";
import LiveBadge from "../LiveBadge";

type Props = {
  groups: Map<string, ArticleSummary[]>;
};

// "Trackers" rail: 4 subcategories that read like ongoing beats rather than
// individual stories. Mirrors how real political desks organize coverage.
const TRACKERS = [
  { slug: "elections",     name: "2026 Elections",      blurb: "Campaigns, primaries and voting." },
  { slug: "white-house",   name: "The White House",     blurb: "Executive branch + presidency." },
  { slug: "congress",      name: "Congress",            blurb: "Lawmaking on Capitol Hill." },
  { slug: "supreme-court", name: "The Supreme Court",   blurb: "The court that shapes the law." },
];

function flatten(groups: Map<string, ArticleSummary[]>): ArticleSummary[] {
  const all: ArticleSummary[] = [];
  for (const list of groups.values()) all.push(...list);
  all.sort((a, b) => {
    const ta = a.published_at ? Date.parse(a.published_at) : 0;
    const tb = b.published_at ? Date.parse(b.published_at) : 0;
    return tb - ta;
  });
  return all;
}

export default function PoliticsLanding({ groups }: Props) {
  const all = flatten(groups);
  const lead = all[0];
  const restPool = all.slice(1);
  const trackerColor = sectionColor("politics");

  return (
    <>
      {/* Trackers rail */}
      <section aria-labelledby="trackers-heading" className="mb-12">
        <h2 id="trackers-heading" className="kicker mb-4">
          Live trackers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TRACKERS.map((t) => {
            const stories = groups.get(t.slug) ?? [];
            const hasLive = stories.some((s) => s.is_live || s.is_breaking);
            return (
              <Link
                key={t.slug}
                href={`/politics/${t.slug}`}
                className="story-link block border border-rule p-4 md:p-5 bg-paper hover:border-ink transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-[10px] uppercase tracking-kicker font-sans font-bold"
                    style={{ color: trackerColor.fg }}
                  >
                    Tracker
                  </span>
                  {hasLive ? <LiveBadge size="sm" /> : null}
                </div>
                <h3 className="headline text-xl md:text-2xl mb-1">{t.name}</h3>
                <p className="dek text-xs md:text-sm mb-4">{t.blurb}</p>
                {stories.length > 0 ? (
                  <ul className="space-y-2.5 mt-3 pt-3 border-t border-rule">
                    {stories.slice(0, 2).map((s) => (
                      <li key={s.id}>
                        <Link
                          href={`/${s.category_slug}/${s.slug}`}
                          className="text-sm text-ink hover:text-accent line-clamp-2 font-serif"
                        >
                          {s.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted font-sans italic mt-2">
                    No coverage yet.
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Lead + rail (foreign-policy emphasized) */}
      {lead ? (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-14">
          <div className="lg:col-span-8">
            <ArticleCard article={lead} variant="lead" priority />
          </div>
          <div className="lg:col-span-4 lg:border-l lg:border-rule lg:pl-8 space-y-8">
            <div>
              <Link
                href="/politics/foreign-policy"
                className="kicker mb-4 block hover:text-accent"
              >
                Foreign Policy
              </Link>
              <div className="space-y-5">
                {(groups.get("foreign-policy") ?? []).slice(0, 3).map((a) => (
                  <div key={a.id} className="rule-bottom pb-4 last:border-0">
                    <ArticleCard article={a} variant="compact" showImage={false} />
                  </div>
                ))}
              </div>
            </div>
            <AdSlot slot="politics-rail" />
          </div>
        </section>
      ) : null}

      {/* More in Politics */}
      {restPool.length > 1 ? (
        <section>
          <h2 className="kicker mb-8">More in Politics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-14">
            {restPool.slice(1, 13).map((a, i) => {
              const cat = findCategory(a.category_slug);
              void cat;
              return (
                <div key={a.id} className="contents">
                  <ArticleCard article={a} />
                  {i === 5 ? (
                    <div className="md:col-span-3">
                      <AdSlot slot="politics-mid" format="horizontal" />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}
