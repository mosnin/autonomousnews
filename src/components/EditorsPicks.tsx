import Link from "next/link";
import type { ArticleSummary } from "@/lib/articles";
import ArticleCard from "./ArticleCard";

export default function EditorsPicks({ articles }: { articles: ArticleSummary[] }) {
  if (articles.length === 0) return null;
  return (
    <section aria-labelledby="editors-picks-heading">
      <div className="flex items-baseline justify-between mb-6 md:mb-8">
        <h2 id="editors-picks-heading" className="kicker text-ink">Editor&rsquo;s Picks</h2>
        <Link href="/editors-picks" className="text-sm font-sans text-muted hover:text-ink uppercase tracking-kicker">
          See all
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-10">
        {articles.slice(0, 3).map((a) => (
          <ArticleCard key={a.id} article={a} variant="default" />
        ))}
      </div>
    </section>
  );
}
