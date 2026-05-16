import type { Metadata } from "next";
import { getFeaturedArticles } from "@/lib/articles";
import { PLACEHOLDER_ARTICLES } from "@/lib/placeholder";
import ArticleCard from "@/components/ArticleCard";
import { SITE } from "@/lib/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Editor's Picks",
  description: `Stories the ${SITE.name} editors think are worth your time.`,
  alternates: { canonical: "/editors-picks" },
};

export default async function EditorsPicksPage() {
  let articles = await getFeaturedArticles(40);
  if (articles.length === 0) {
    articles = PLACEHOLDER_ARTICLES.filter((a) => a.is_featured);
  }

  return (
    <div className="max-w-content mx-auto px-4 md:px-8 pt-8 md:pt-12 pb-16">
      <header className="rule-bottom pb-8 mb-10">
        <div className="kicker text-muted mb-2">Curated</div>
        <h1 className="headline text-4xl md:text-6xl mb-3">Editor&rsquo;s Picks</h1>
        <p className="dek text-base md:text-lg max-w-3xl">
          The stories our editors think are worth your time this week.
        </p>
      </header>

      {articles.length === 0 ? (
        <p className="dek">No editor&rsquo;s picks yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-12">
          {articles.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      )}
    </div>
  );
}
