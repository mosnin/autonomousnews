import {
  getFeaturedArticles,
  getLatestArticles,
  getMostReadArticles,
  getBreakingHeadlines,
} from "@/lib/articles";
import { PLACEHOLDER_ARTICLES } from "@/lib/placeholder";
import ArticleCard from "@/components/ArticleCard";
import AdSlot from "@/components/AdSlot";
import HeadlineTicker from "@/components/HeadlineTicker";
import MostReadSidebar from "@/components/MostReadSidebar";
import EditorsPicks from "@/components/EditorsPicks";
import NewsletterSignup from "@/components/NewsletterSignup";

export const revalidate = 300;

export default async function HomePage() {
  let featured = await getFeaturedArticles(8);
  let latest = await getLatestArticles(24);
  let mostRead = await getMostReadArticles(5);
  let breaking = await getBreakingHeadlines(5);

  if (featured.length === 0 && latest.length === 0) {
    featured = PLACEHOLDER_ARTICLES.filter((a) => a.is_featured).slice(0, 6);
    latest = PLACEHOLDER_ARTICLES;
    mostRead = PLACEHOLDER_ARTICLES.slice(0, 5);
    breaking = PLACEHOLDER_ARTICLES.filter((a) => a.is_breaking).slice(0, 5);
  }

  const hero = featured[0] ?? latest[0];
  const next = featured.slice(1, 4);
  const picks = featured.slice(4, 7);
  const usedIds = new Set([
    hero?.id,
    ...next.map((a) => a.id),
    ...picks.map((a) => a.id),
  ].filter(Boolean));
  const river = latest.filter((a) => !usedIds.has(a.id));

  if (!hero) {
    return (
      <div className="max-w-content mx-auto px-4 py-32 text-center">
        <h1 className="headline text-4xl mb-3">Techno Times is warming up.</h1>
        <p className="dek">Articles will begin to appear here within the hour.</p>
      </div>
    );
  }

  return (
    <>
      {breaking.length > 0 ? <HeadlineTicker headlines={breaking} /> : null}

      <div className="max-w-content mx-auto px-4 md:px-8 pt-6 md:pt-10 pb-16">
        {/* Hero */}
        <section className="mb-10 md:mb-16 animate-fade-up">
          <ArticleCard article={hero} variant="hero" priority />
        </section>

        {next.length > 0 ? (
          <section className="rule-top rule-bottom py-8 md:py-10 mb-10 md:mb-16">
            <h2 className="kicker text-muted mb-5">What&rsquo;s next</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {next.map((a) => (
                <ArticleCard key={a.id} article={a} variant="compact" showImage={false} />
              ))}
            </div>
          </section>
        ) : null}

        {/* River + Most-read rail */}
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 lg:gap-14">
          <div>
            <div className="flex items-baseline justify-between mb-6 md:mb-8">
              <h2 className="kicker text-muted">The latest</h2>
              <a
                href="/feed.xml"
                className="text-sm font-sans text-muted hover:text-ink uppercase tracking-kicker"
              >
                RSS
              </a>
            </div>
            <div className="space-y-10 md:space-y-12 max-w-4xl">
              {river.map((a, i) => (
                <div key={a.id}>
                  <div className="rule-top pt-8 first:pt-0 first:rule-top-0 md:first:border-t-0">
                    <ArticleCard article={a} variant="river" />
                  </div>
                  {i === 5 ? (
                    <div className="mt-10">
                      <AdSlot slot="home-mid-banner" format="horizontal" />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-10 lg:sticky lg:top-32 lg:self-start">
            <MostReadSidebar articles={mostRead} />
            <NewsletterSignup source="home-rail" />
            <AdSlot slot="home-rail" />
          </div>
        </section>

        {/* Editor's Picks */}
        {picks.length > 0 ? (
          <section className="mt-16 md:mt-20 pt-12 border-t border-rule">
            <EditorsPicks articles={picks} />
          </section>
        ) : null}
      </div>
    </>
  );
}
