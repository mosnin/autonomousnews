import Link from "next/link";
import type { ArticleSummary } from "@/lib/articles";
import ArticleCard from "@/components/ArticleCard";
import AdSlot from "@/components/AdSlot";
import { sectionColor } from "@/lib/sectionColors";
import LiveBadge from "../LiveBadge";

type Props = {
  groups: Map<string, ArticleSummary[]>;
};

const LEAGUES = [
  { slug: "soccer",      name: "Soccer" },
  { slug: "football",    name: "NFL" },
  { slug: "basketball",  name: "NBA" },
  { slug: "baseball",    name: "MLB" },
  { slug: "tennis",      name: "Tennis" },
  { slug: "olympics",    name: "Olympics" },
  { slug: "auto-racing", name: "Motorsports" },
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

export default function SportsLanding({ groups }: Props) {
  const all = flatten(groups);
  const lead = all[0];
  const rest = all.slice(1);
  const sc = sectionColor("sports");

  return (
    <>
      {/* Scoreboard strip — horizontal scroll on mobile */}
      <section aria-labelledby="leagues-heading" className="mb-12 -mx-4 md:mx-0">
        <h2 id="leagues-heading" className="kicker mb-4 px-4 md:px-0">
          Leagues
        </h2>
        <div className="flex md:grid md:grid-cols-7 gap-3 overflow-x-auto px-4 md:px-0 snap-x snap-mandatory pb-2">
          {LEAGUES.map((l) => {
            const latest = (groups.get(l.slug) ?? [])[0];
            return (
              <Link
                key={l.slug}
                href={`/sports/${l.slug}`}
                className="story-link min-w-[180px] md:min-w-0 snap-start border border-rule p-3 hover:border-ink transition-colors flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] uppercase tracking-kicker font-sans font-bold"
                    style={{ color: sc.fg }}
                  >
                    {l.name}
                  </span>
                  {latest?.is_live ? <LiveBadge size="sm" /> : null}
                </div>
                {latest ? (
                  <div className="font-serif text-sm leading-snug line-clamp-3">
                    {latest.title}
                  </div>
                ) : (
                  <div className="text-xs text-muted italic font-sans">
                    No coverage yet
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Lead */}
      {lead ? (
        <section className="mb-14">
          <ArticleCard article={lead} variant="lead" priority />
        </section>
      ) : null}

      {/* By-league sections — only show leagues that have ≥1 story */}
      {LEAGUES.map((l) => {
        const stories = (groups.get(l.slug) ?? []).filter(
          (s) => s.id !== lead?.id
        );
        if (stories.length === 0) return null;
        return (
          <section key={l.slug} className="mb-12">
            <div className="flex items-baseline justify-between mb-5 rule-bottom pb-2">
              <Link href={`/sports/${l.slug}`} className="hover:text-accent">
                <h3
                  className="text-xl md:text-2xl font-display font-bold"
                  style={{ color: sc.fg }}
                >
                  {l.name}
                </h3>
              </Link>
              <Link
                href={`/sports/${l.slug}`}
                className="text-[11px] uppercase tracking-kicker font-sans text-muted hover:text-ink"
              >
                Full coverage
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-10">
              {stories.slice(0, 3).map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Tail — everything else not yet shown */}
      {rest.length > LEAGUES.length * 3 ? (
        <section className="mt-12 pt-10 border-t border-rule">
          <h2 className="kicker mb-6">More in Sports</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-12">
            {rest.slice(0, 6).map((a, i) => (
              <div key={a.id} className="contents">
                <ArticleCard article={a} />
                {i === 5 ? (
                  <div className="md:col-span-3">
                    <AdSlot slot="sports-mid" format="horizontal" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
