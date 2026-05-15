import {
  getFeaturedArticles,
  getLatestArticles,
  type ArticleSummary,
} from "@/lib/articles";
import { PLACEHOLDER_ARTICLES } from "@/lib/placeholder";
import ArticleCard from "@/components/ArticleCard";
import AdSlot from "@/components/AdSlot";

export const revalidate = 300; // 5 minutes

export default async function HomePage() {
  let featured = await getFeaturedArticles(5);
  let latest = await getLatestArticles(24);

  if (featured.length === 0 && latest.length === 0) {
    // Supabase not configured yet — show shell with placeholders.
    featured = PLACEHOLDER_ARTICLES.filter((a) => a.is_featured).slice(0, 4);
    latest = PLACEHOLDER_ARTICLES;
  }

  const lead = featured[0] ?? latest[0];
  const secondary = featured.slice(1, 4);
  const rest = latest
    .filter((a) => a.id !== lead?.id && !secondary.some((s) => s.id === a.id))
    .slice(0, 12);

  if (!lead) {
    return (
      <div className="max-w-content mx-auto px-4 py-20 text-center">
        <h1 className="headline text-3xl mb-2">Coming soon</h1>
        <p className="dek">No articles published yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-content mx-auto px-4 pt-6 pb-12">
      <section className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
        {/* Left column — secondary stack */}
        <div className="md:col-span-3 order-2 md:order-1 md:border-r md:border-rule md:pr-6 space-y-5">
          {secondary[0] ? (
            <ArticleCard article={secondary[0]} variant="compact" showImage={false} />
          ) : null}
          {secondary[1] ? (
            <div className="rule-top pt-4">
              <ArticleCard article={secondary[1]} variant="compact" showImage={false} />
            </div>
          ) : null}
        </div>

        {/* Center — lead story */}
        <div className="md:col-span-6 order-1 md:order-2">
          <ArticleCard article={lead} variant="lead" />
        </div>

        {/* Right column */}
        <div className="md:col-span-3 order-3 md:border-l md:border-rule md:pl-6 space-y-5">
          {secondary[2] ? (
            <ArticleCard article={secondary[2]} variant="compact" />
          ) : null}
          <AdSlot slot="home-rail-top" />
        </div>
      </section>

      <hr className="border-rule my-10" />

      {/* Latest grid */}
      <section>
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="kicker">Latest</h2>
          <a href="/latest" className="text-sm underline text-accent">
            See all
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-10">
          {rest.map((a: ArticleSummary, i) => (
            <div key={a.id} className="contents">
              <ArticleCard article={a} variant="default" />
              {i === 5 ? (
                <div className="md:col-span-3">
                  <AdSlot slot="home-mid-banner" format="horizontal" />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
