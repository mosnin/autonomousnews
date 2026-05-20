import Link from "next/link";
import type { ArticleSummary } from "@/lib/articles";
import { ARTICLE_BYLINE } from "@/lib/authors";
import { sectionColor } from "@/lib/sectionColors";
import AdSlot from "@/components/AdSlot";

type Props = {
  groups: Map<string, ArticleSummary[]>;
};

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

export default function OpinionLanding({ groups }: Props) {
  const all = flatten(groups);
  const lead = all[0];

  const editorials = (groups.get("editorials") ?? []).filter((a) => a.id !== lead?.id);
  const guestEssays = (groups.get("guest-essays") ?? []).filter((a) => a.id !== lead?.id);
  const letters = (groups.get("letters") ?? []).filter((a) => a.id !== lead?.id);

  const sc = sectionColor("opinion");

  return (
    <>
      {/* Lead opinion */}
      {lead ? (
        <section className="mb-14 max-w-4xl">
          <Link href={`/${lead.category_slug}/${lead.slug}`} className="story-link block">
            <div className="section-ribbon" />
            <div className="kicker mb-3" style={{ color: sc.fg }}>
              {lead.subcategory_slug === "editorials"
                ? "Editorial"
                : lead.subcategory_slug === "guest-essays"
                ? "Guest Essay"
                : lead.subcategory_slug === "letters"
                ? "Letter"
                : "Column"}
            </div>
            <h2 className="headline text-4xl md:text-6xl mb-4">{lead.title}</h2>
            {lead.dek ? (
              <p
                className="text-lg md:text-2xl italic leading-snug mb-5 font-serif"
                style={{ color: "rgb(var(--muted))" }}
              >
                {lead.dek}
              </p>
            ) : null}
            <div className="byline uppercase tracking-kicker text-[11px]">
              {ARTICLE_BYLINE}
            </div>
          </Link>
        </section>
      ) : null}

      {/* Two-column: Editorials + Guest Essays */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 mb-14">
        <div>
          <div className="flex items-baseline justify-between mb-5 rule-bottom pb-2">
            <h3 className="text-xl md:text-2xl font-display font-bold" style={{ color: sc.fg }}>
              From the Editorial Board
            </h3>
            <Link
              href="/opinion/editorials"
              className="text-[11px] uppercase tracking-kicker font-sans text-muted hover:text-ink"
            >
              All editorials
            </Link>
          </div>
          {editorials.length === 0 ? (
            <p className="dek italic text-sm">No editorials yet.</p>
          ) : (
            <ul className="space-y-5">
              {editorials.slice(0, 4).map((a) => (
                <li key={a.id} className="rule-bottom pb-4 last:border-0">
                  <Link href={`/${a.category_slug}/${a.slug}`} className="story-link block">
                    <h4 className="headline text-lg md:text-xl mb-1">{a.title}</h4>
                    {a.dek ? (
                      <p className="dek text-sm italic line-clamp-2 font-serif">{a.dek}</p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-5 rule-bottom pb-2">
            <h3 className="text-xl md:text-2xl font-display font-bold" style={{ color: sc.fg }}>
              Guest Essays
            </h3>
            <Link
              href="/opinion/guest-essays"
              className="text-[11px] uppercase tracking-kicker font-sans text-muted hover:text-ink"
            >
              All essays
            </Link>
          </div>
          {guestEssays.length === 0 ? (
            <p className="dek italic text-sm">No guest essays yet.</p>
          ) : (
            <ul className="space-y-5">
              {guestEssays.slice(0, 4).map((a) => (
                <li key={a.id} className="rule-bottom pb-4 last:border-0">
                  <Link href={`/${a.category_slug}/${a.slug}`} className="story-link block">
                    <h4 className="headline text-lg md:text-xl mb-1">{a.title}</h4>
                    {a.dek ? (
                      <p className="dek text-sm italic line-clamp-2 font-serif">{a.dek}</p>
                    ) : null}
                    <div className="byline mt-1 uppercase tracking-kicker text-[10px]">
                      {ARTICLE_BYLINE}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Letters */}
      {letters.length > 0 ? (
        <section className="rule-top pt-10 mb-10">
          <div className="flex items-baseline justify-between mb-5">
            <h3 className="text-xl md:text-2xl font-display font-bold" style={{ color: sc.fg }}>
              Readers Respond
            </h3>
            <Link
              href="/opinion/letters"
              className="text-[11px] uppercase tracking-kicker font-sans text-muted hover:text-ink"
            >
              All letters
            </Link>
          </div>
          <ul className="space-y-3">
            {letters.slice(0, 5).map((a) => (
              <li key={a.id}>
                <Link
                  href={`/${a.category_slug}/${a.slug}`}
                  className="font-serif italic text-base hover:text-accent"
                >
                  &ldquo;{a.title}&rdquo;
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <AdSlot slot="opinion-mid" format="horizontal" />
    </>
  );
}
