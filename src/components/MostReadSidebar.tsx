import Link from "next/link";
import type { ArticleSummary } from "@/lib/articles";
import { sectionColor } from "@/lib/sectionColors";
import { ARTICLE_BYLINE } from "@/lib/authors";

export default function MostReadSidebar({
  articles,
  heading = "Most read",
}: {
  articles: ArticleSummary[];
  heading?: string;
}) {
  if (articles.length === 0) return null;
  return (
    <aside aria-labelledby="most-read-heading">
      <h2 id="most-read-heading" className="kicker mb-4">
        {heading}
      </h2>
      <ol className="space-y-5">
        {articles.map((a, i) => {
          const c = sectionColor(a.category_slug);
          return (
            <li key={a.id} className="flex gap-3 items-start">
              <span
                className="font-display text-3xl leading-none shrink-0 tabular-nums"
                style={{ color: c.fg }}
              >
                {i + 1}
              </span>
              <Link href={`/${a.category_slug}/${a.slug}`} className="story-link block">
                <h3 className="headline text-base md:text-lg leading-tight">
                  {a.title}
                </h3>
                <div className="byline mt-1.5 text-[11px] uppercase tracking-kicker">
                  {ARTICLE_BYLINE}
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
