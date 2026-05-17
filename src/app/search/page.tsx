import type { Metadata } from "next";
import Link from "next/link";
import { searchArticles, searchPillars } from "@/lib/articles";
import ArticleCard from "@/components/ArticleCard";

export const metadata: Metadata = {
  title: "Search",
  description: "Search Techno Times for breaking news and analysis.",
  alternates: { canonical: "/search" },
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const [results, pillars] =
    query.length >= 2
      ? await Promise.all([searchArticles(query, 40), searchPillars(query, 3)])
      : [[], []];

  return (
    <div className="max-w-content mx-auto px-4 md:px-8 pt-10 pb-12">
      <header className="mb-6">
        <div className="kicker text-muted mb-2">Search</div>
        <h1 className="headline text-3xl md:text-4xl">
          {query ? `Results for “${query}”` : "Search Techno Times"}
        </h1>
      </header>

      <form action="/search" method="get" className="mb-10 flex gap-2 max-w-xl">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="What are you looking for?"
          className="flex-1 border border-rule px-3 py-2 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
          aria-label="Search articles"
          minLength={2}
        />
        <button
          type="submit"
          className="bg-ink text-white px-4 py-2 hover:opacity-90"
        >
          Search
        </button>
      </form>

      {query.length < 2 ? (
        <p className="dek">Enter at least two characters to begin a search.</p>
      ) : results.length === 0 && pillars.length === 0 ? (
        <p className="dek">Nothing on Techno Times matches “{query}”.</p>
      ) : (
        <>
          {pillars.length > 0 ? (
            <section className="mb-10" aria-labelledby="topic-guides-heading">
              <h2
                id="topic-guides-heading"
                className="kicker text-muted mb-3"
              >
                Topic guides
              </h2>
              <ul className="divide-y divide-rule border-y border-rule">
                {pillars.map((p) => (
                  <li key={`${p.category_slug}/${p.subcategory_slug}`}>
                    <Link
                      href={`/${p.category_slug}/${p.subcategory_slug}`}
                      className="block py-3 hover:bg-wash"
                    >
                      <div className="font-display font-bold">{p.title}</div>
                      {p.dek ? (
                        <p className="text-sm text-muted mt-0.5">{p.dek}</p>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {results.length > 0 ? (
            <section aria-labelledby="article-results-heading">
              <h2
                id="article-results-heading"
                className="kicker text-muted mb-3"
              >
                {results.length} article{results.length === 1 ? "" : "s"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-10">
                {results.map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
