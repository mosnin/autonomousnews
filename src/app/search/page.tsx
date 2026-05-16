import type { Metadata } from "next";
import { searchArticles } from "@/lib/articles";
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
  const results = query.length >= 2 ? await searchArticles(query, 40) : [];

  return (
    <div className="max-w-content mx-auto px-4 pt-10 pb-12">
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
          className="flex-1 border border-rule px-3 py-2 text-base"
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
      ) : results.length === 0 ? (
        <p className="dek">No published articles match “{query}”.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-10">
          {results.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      )}
    </div>
  );
}
