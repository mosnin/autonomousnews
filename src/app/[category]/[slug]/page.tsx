import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { findCategory, findSubcategory } from "@/lib/taxonomy";
import {
  getArticleBySlug,
  getArticlesBySubcategory,
  getRelatedArticles,
  getStoryUpdates,
  getSubcategoryPillar,
} from "@/lib/articles";
import { PLACEHOLDER_ARTICLES } from "@/lib/placeholder";
import ArticleCard from "@/components/ArticleCard";
import AdSlot from "@/components/AdSlot";
import ArticleDisclaimer from "@/components/ArticleDisclaimer";
import SectionStyle from "@/components/SectionStyle";
import ArticleToolbar from "@/components/ArticleToolbar";
import ArticleReactions from "@/components/ArticleReactions";
import ViewPing from "@/components/ViewPing";
import TopicChips from "@/components/TopicChips";
import SourcesBlock from "@/components/SourcesBlock";
import StoryUpdatesTimeline from "@/components/StoryUpdatesTimeline";
import SubcategoryPillarBlock from "@/components/SubcategoryPillar";
import LiveBadge from "@/components/LiveBadge";
import NewsletterSignup from "@/components/NewsletterSignup";
import TableOfContents from "@/components/TableOfContents";
import ArticleFAQ from "@/components/ArticleFAQ";
import { SITE } from "@/lib/site";
import { EDITOR, ARTICLE_BYLINE } from "@/lib/authors";
import { renderArticleBody, extractChapters } from "@/lib/articleBody";
import { breadcrumbListLd } from "@/lib/jsonld";
import { coverImageAlt } from "@/lib/imageAlt";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

async function getReactionCounts(articleId: string): Promise<{ up: number; down: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { up: 0, down: 0 };
  const { data } = await supabase
    .from("article_reactions")
    .select("thumbs_up, thumbs_down")
    .eq("article_id", articleId)
    .maybeSingle();
  const row = data as { thumbs_up?: number; thumbs_down?: number } | null;
  return { up: row?.thumbs_up ?? 0, down: row?.thumbs_down ?? 0 };
}

export const revalidate = 300;

type Params = { category: string; slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { category, slug } = await params;
  // Case 1: subcategory listing (slug is a subcategory)
  const sub = findSubcategory(category, slug);
  if (sub) {
    return {
      title: `${sub.subcategory.name} — ${sub.category.name}`,
      description: sub.subcategory.description,
      alternates: { canonical: `/${category}/${slug}` },
    };
  }
  // Case 2: article page
  const article = await getArticleBySlug(slug);
  if (!article) return {};
  const title = article.seo_title ?? article.title;
  const description = article.seo_description ?? article.dek ?? article.excerpt ?? "";
  // Long-tail + focus keyword power the <meta keywords> tag. Most search
  // engines downweight it, but Bing still reads it and AdSense uses it
  // for category matching.
  const keywords = [
    ...(article.focus_keyword ? [article.focus_keyword] : []),
    ...(article.long_tail_keywords ?? []),
    ...(article.seo_keywords ?? []),
  ];
  return {
    title,
    description,
    keywords,
    alternates: { canonical: `/${article.category_slug}/${article.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${SITE.url}/${article.category_slug}/${article.slug}`,
      publishedTime: article.published_at ?? undefined,
      modifiedTime: article.updated_at,
      authors: [SITE.name],
      images: article.cover_image_url ? [article.cover_image_url] : undefined,
    },
  };
}

export default async function CategorySlugPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { category, slug } = await params;

  // First: is this a known subcategory? Render subcategory listing.
  const sub = findSubcategory(category, slug);
  if (sub) {
    const [articlesResult, pillar] = await Promise.all([
      getArticlesBySubcategory(category, slug, 30),
      getSubcategoryPillar(category, slug),
    ]);
    let articles = articlesResult;
    if (articles.length === 0) {
      articles = PLACEHOLDER_ARTICLES.filter(
        (a) => a.category_slug === category && a.subcategory_slug === slug
      );
    }
    return renderSubcategory(sub.category.slug, sub.subcategory, articles, pillar);
  }

  // Else: try to load article
  const article = await getArticleBySlug(slug);
  if (!article || article.category_slug !== category) notFound();

  const filteredRelated = await getRelatedArticles(
    {
      id: article.id,
      category_slug: article.category_slug,
      subcategory_slug: article.subcategory_slug,
      tags: article.tags,
    },
    4
  );

  // FAQPage JSON-LD for the article-level FAQ. Emitted here (rather than from
  // ArticleFAQ.tsx) so we don't double-emit the same block of structured data
  // — Google flags duplicate FAQPage entities on the same URL.
  const articleFaqLd =
    article.faq && article.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: article.faq.map((it) => ({
            "@type": "Question",
            name: it.q,
            acceptedAnswer: { "@type": "Answer", text: it.a },
          })),
        }
      : null;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.dek ?? article.excerpt ?? undefined,
    image: article.cover_image_url ? [article.cover_image_url] : undefined,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: { "@type": "Organization", name: SITE.name, url: SITE.url },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      logo: { "@type": "ImageObject", url: `${SITE.url}/logo.png` },
    },
    mainEntityOfPage: `${SITE.url}/${article.category_slug}/${article.slug}`,
    keywords: article.seo_keywords?.join(", "),
    articleSection: findCategory(article.category_slug)?.name,
  };

  const cat = findCategory(article.category_slug);
  const chapters = extractChapters(article.body);
  const [reactions, updates] = await Promise.all([
    getReactionCounts(article.id),
    getStoryUpdates(article.id),
  ]);
  const articleUrl = `${SITE.url}/${article.category_slug}/${article.slug}`;

  const breadcrumbs = breadcrumbListLd([
    { name: "Home", url: "/" },
    ...(cat ? [{ name: cat.name, url: `/${cat.slug}` }] : []),
    ...(article.subcategory_slug && cat
      ? (() => {
          const sub = cat.subcategories.find((s) => s.slug === article.subcategory_slug);
          return sub ? [{ name: sub.name, url: `/${cat.slug}/${sub.slug}` }] : [];
        })()
      : []),
    { name: article.title, url: `/${article.category_slug}/${article.slug}` },
  ]);

  return (
    <SectionStyle as="article" slug={article.category_slug} className="pt-6 md:pt-10 pb-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      {articleFaqLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleFaqLd) }}
        />
      ) : null}
      <header className="max-w-prose mx-auto px-4 mb-8 md:mb-12 animate-fade-up">
        <div className="section-ribbon" />
        <div className="flex items-center gap-3 mb-3">
          {cat ? (
            <div className="kicker">
              <Link href={`/${cat.slug}`}>{cat.name}</Link>
            </div>
          ) : null}
          {article.is_live ? <LiveBadge /> : null}
        </div>
        <h1 className="headline text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-4 leading-[1.05]">
          {article.title}
        </h1>
        {article.dek ? (
          <p className="dek text-lg md:text-2xl leading-snug">{article.dek}</p>
        ) : null}
        <div className="byline mt-6 flex flex-wrap gap-x-4 gap-y-1 uppercase tracking-kicker text-[11px]">
          <span className="text-ink">{ARTICLE_BYLINE}</span>
          {article.published_at ? (
            <time dateTime={article.published_at}>
              {new Date(article.published_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          ) : null}
          {article.read_minutes ? <span>{article.read_minutes} min read</span> : null}
          {article.update_count > 0 && article.updated_at ? (
            <span title={article.updated_at}>
              Updated{" "}
              {new Date(article.updated_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          ) : null}
        </div>
      </header>

      {article.cover_image_url ? (
        <figure className="max-w-content mx-auto px-0 md:px-8 mb-10 md:mb-14">
          {/* Article hero — let Next pick the best format/size. */}
          <Image
            src={article.cover_image_url}
            alt={coverImageAlt(article)}
            width={1600}
            height={900}
            sizes="(max-width: 1024px) 100vw, 1280px"
            className="w-full h-auto"
            priority
          />

          <figcaption className="byline mt-3 flex flex-wrap gap-3 px-4 md:px-0 max-w-prose mx-auto">
            {article.cover_image_alt ? <span>{article.cover_image_alt}</span> : null}
            {article.image_is_ai_generated ? (
              <span>Illustration: AI-generated by Techno Times</span>
            ) : article.image_credit ? (
              <span>
                Image:{" "}
                {article.image_source_url ? (
                  <a
                    href={article.image_source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {article.image_credit}
                  </a>
                ) : (
                  article.image_credit
                )}
              </span>
            ) : null}
          </figcaption>
        </figure>
      ) : null}

      <ViewPing articleId={article.id} />

      <div className="max-w-prose mx-auto px-4">
        <ArticleToolbar
          articleId={article.id}
          title={article.title}
          url={articleUrl}
        />
        <TableOfContents
          chapters={chapters}
          hasFAQ={!!article.faq && article.faq.length > 0}
        />
      </div>

      <div className="max-w-prose mx-auto px-4 prose-article">
        {renderArticleBody(article.body, {
          excludeHrefs: new Set(
            [
              `/${article.category_slug}`,
              article.subcategory_slug
                ? `/${article.category_slug}/${article.subcategory_slug}`
                : null,
            ].filter((v): v is string => !!v)
          ),
          maxLinks: 6,
          // Body images are only allowed when their URL appears either in
          // the cited sources or as the article's own cover image. Anything
          // else the writer tries to embed is dropped silently.
          allowedImageUrls: new Set(
            [
              article.cover_image_url,
              ...(article.sources_used ?? []).map((s) => s.url),
            ].filter((v): v is string => !!v)
          ),
        })}
      </div>

      <div className="max-w-prose mx-auto px-4">
        <ArticleReactions
          articleId={article.id}
          initialUp={reactions.up}
          initialDown={reactions.down}
        />
        <ArticleFAQ items={article.faq ?? []} />
        <SourcesBlock
          urls={article.source_urls ?? []}
          sources={article.sources_used ?? null}
        />
        <TopicChips tags={article.tags ?? []} />
        <StoryUpdatesTimeline updates={updates} />
        <AdSlot slot="article-inline" />
      </div>

      <div className="max-w-prose mx-auto px-4">
        <ArticleDisclaimer
          categorySlug={article.category_slug}
          subcategorySlug={article.subcategory_slug}
          aiDisclosed={article.ai_disclosed}
        />
        <aside className="mt-10 border-t border-rule pt-6">
          <div className="kicker mb-2">How this story was made</div>
          <p className="dek text-sm">
            Researched and drafted by Techno Times AI agents from primary
            sources, fact-checked by an independent AI, and reviewed before
            publication by {EDITOR.name}, {EDITOR.title}.{" "}
            <Link href="/agents" className="text-accent underline">
              See how the newsroom works
            </Link>
            .
          </p>
        </aside>
        <div className="mt-12">
          <NewsletterSignup source="article-inline" />
        </div>
      </div>

      {filteredRelated.length > 0 ? (
        <section className="max-w-content mx-auto px-4 md:px-8 mt-16 pt-10 border-t border-rule">
          <h2 className="kicker mb-6">More in {cat?.name ?? "News"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {filteredRelated.map((a) => (
              <ArticleCard key={a.id} article={a} variant="default" />
            ))}
          </div>
        </section>
      ) : null}
    </SectionStyle>
  );
}

function renderSubcategory(
  categorySlug: string,
  subcategory: { slug: string; name: string; description: string },
  articles: Awaited<ReturnType<typeof getArticlesBySubcategory>>,
  pillar: Awaited<ReturnType<typeof getSubcategoryPillar>>
) {
  const category = findCategory(categorySlug)!;
  const lead = articles[0];
  const rest = articles.slice(1);

  const subBreadcrumbs = breadcrumbListLd([
    { name: "Home", url: "/" },
    { name: category.name, url: `/${category.slug}` },
    { name: subcategory.name, url: `/${category.slug}/${subcategory.slug}` },
  ]);

  // When a pillar exists, emit Article-style JSON-LD describing it as a
  // reference document, plus FAQPage from the pillar FAQ if present.
  const pillarLd = pillar
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: pillar.title,
        description: pillar.dek ?? undefined,
        author: { "@type": "Organization", name: SITE.name },
        datePublished: pillar.generated_at,
        dateModified: pillar.updated_at,
        mainEntityOfPage: `${SITE.url}/${category.slug}/${subcategory.slug}`,
        keywords: [pillar.focus_keyword, ...pillar.long_tail_keywords]
          .filter(Boolean)
          .join(", "),
      }
    : null;
  const pillarFAQ =
    pillar?.faq && pillar.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: pillar.faq.map((it) => ({
            "@type": "Question",
            name: it.q,
            acceptedAnswer: { "@type": "Answer", text: it.a },
          })),
        }
      : null;

  return (
    <SectionStyle slug={category.slug} className="max-w-content mx-auto px-4 md:px-8 pt-8 md:pt-12 pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(subBreadcrumbs) }}
      />
      {pillarLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(pillarLd) }}
        />
      ) : null}
      {pillarFAQ ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(pillarFAQ) }}
        />
      ) : null}
      <header className="rule-bottom pb-8 mb-10">
        <div className="section-ribbon" />
        <div className="kicker mb-2">
          <Link href={`/${category.slug}`}>{category.name}</Link>
        </div>
        <h1 className="headline text-4xl md:text-6xl mb-4">{subcategory.name}</h1>
        <p className="dek max-w-3xl text-lg">{subcategory.description}</p>
      </header>

      {pillar ? (
        <SubcategoryPillarBlock
          pillar={pillar}
          excludeHrefs={
            new Set([
              `/${category.slug}`,
              `/${category.slug}/${subcategory.slug}`,
            ])
          }
        />
      ) : null}

      {lead ? (
        <section className="mb-10">
          <ArticleCard article={lead} variant="lead" />
        </section>
      ) : (
        <p className="dek">No stories yet in this topic.</p>
      )}

      {rest.length > 0 ? (
        <section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-12">
            {rest.map((a, i) => (
              <div key={a.id} className="contents">
                <ArticleCard article={a} />
                {i === 5 ? (
                  <div className="md:col-span-3">
                    <AdSlot slot={`${category.slug}-${subcategory.slug}-mid`} format="horizontal" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </SectionStyle>
  );
}
