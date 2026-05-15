import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { findCategory, findSubcategory } from "@/lib/taxonomy";
import {
  getArticleBySlug,
  getArticlesBySubcategory,
  getArticlesByCategory,
} from "@/lib/articles";
import { PLACEHOLDER_ARTICLES } from "@/lib/placeholder";
import ArticleCard from "@/components/ArticleCard";
import AdSlot from "@/components/AdSlot";
import { SITE } from "@/lib/site";

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
  return {
    title,
    description,
    keywords: article.seo_keywords,
    alternates: { canonical: `/${article.category_slug}/${article.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${SITE.url}/${article.category_slug}/${article.slug}`,
      publishedTime: article.published_at ?? undefined,
      modifiedTime: article.updated_at,
      authors: [article.author_name],
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
    let articles = await getArticlesBySubcategory(category, slug, 30);
    if (articles.length === 0) {
      articles = PLACEHOLDER_ARTICLES.filter(
        (a) => a.category_slug === category && a.subcategory_slug === slug
      );
    }
    return renderSubcategory(sub.category.slug, sub.subcategory, articles);
  }

  // Else: try to load article
  const article = await getArticleBySlug(slug);
  if (!article || article.category_slug !== category) notFound();

  const related = await getArticlesByCategory(article.category_slug, 6);
  const filteredRelated = related.filter((a) => a.id !== article.id).slice(0, 4);

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.dek ?? article.excerpt ?? undefined,
    image: article.cover_image_url ? [article.cover_image_url] : undefined,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: [{ "@type": "Person", name: article.author_name }],
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

  return (
    <article className="max-w-content mx-auto px-4 pt-8 pb-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <header className="max-w-3xl mx-auto text-center mb-8">
        {cat ? (
          <div className="kicker mb-3">
            <Link href={`/${cat.slug}`}>{cat.name}</Link>
          </div>
        ) : null}
        <h1 className="headline text-3xl md:text-5xl mb-4">{article.title}</h1>
        {article.dek ? (
          <p className="dek text-lg md:text-xl">{article.dek}</p>
        ) : null}
        <div className="byline mt-5 flex justify-center gap-4">
          <span>By {article.author_name}</span>
          {article.published_at ? (
            <time dateTime={article.published_at}>
              {new Date(article.published_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          ) : null}
          {article.read_minutes ? <span>{article.read_minutes} Min Read</span> : null}
        </div>
      </header>

      {article.cover_image_url ? (
        <figure className="max-w-4xl mx-auto mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.cover_image_url}
            alt={article.cover_image_alt ?? ""}
            className="w-full h-auto"
          />
          {article.cover_image_alt ? (
            <figcaption className="byline mt-2">{article.cover_image_alt}</figcaption>
          ) : null}
        </figure>
      ) : null}

      <div className="max-w-2xl mx-auto prose-article">
        {article.body.split("\n\n").map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <div className="max-w-2xl mx-auto">
        <AdSlot slot="article-inline" />
      </div>

      {filteredRelated.length > 0 ? (
        <section className="max-w-content mx-auto mt-12 pt-8 border-t border-rule">
          <h2 className="kicker mb-6">More in {cat?.name ?? "News"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {filteredRelated.map((a) => (
              <ArticleCard key={a.id} article={a} variant="default" />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

function renderSubcategory(
  categorySlug: string,
  subcategory: { slug: string; name: string; description: string },
  articles: Awaited<ReturnType<typeof getArticlesBySubcategory>>
) {
  const category = findCategory(categorySlug)!;
  const lead = articles[0];
  const rest = articles.slice(1);

  return (
    <div className="max-w-content mx-auto px-4 pt-8 pb-12">
      <header className="rule-bottom pb-6 mb-8">
        <div className="kicker text-muted mb-2">
          <Link href={`/${category.slug}`} className="hover:underline">
            {category.name}
          </Link>
        </div>
        <h1 className="headline text-4xl md:text-5xl mb-3">{subcategory.name}</h1>
        <p className="dek max-w-3xl">{subcategory.description}</p>
      </header>

      {lead ? (
        <section className="mb-10">
          <ArticleCard article={lead} variant="lead" />
        </section>
      ) : (
        <p className="dek">No stories yet in this topic.</p>
      )}

      {rest.length > 0 ? (
        <section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-10">
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
    </div>
  );
}
