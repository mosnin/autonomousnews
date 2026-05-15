import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES, findCategory } from "@/lib/taxonomy";
import { getArticlesByCategory } from "@/lib/articles";
import { PLACEHOLDER_ARTICLES } from "@/lib/placeholder";
import ArticleCard from "@/components/ArticleCard";
import AdSlot from "@/components/AdSlot";
import { SITE } from "@/lib/site";

export const revalidate = 300;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const category = findCategory(slug);
  if (!category) return {};
  return {
    title: `${category.name} News`,
    description: category.description,
    alternates: { canonical: `/${category.slug}` },
    openGraph: {
      title: `${category.name} News — ${SITE.name}`,
      description: category.description,
      url: `${SITE.url}/${category.slug}`,
      type: "website",
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const category = findCategory(slug);
  if (!category) notFound();

  let articles = await getArticlesByCategory(category.slug, 30);
  if (articles.length === 0) {
    articles = PLACEHOLDER_ARTICLES.filter((a) => a.category_slug === category.slug);
  }

  const lead = articles[0];
  const rest = articles.slice(1);

  return (
    <div className="max-w-content mx-auto px-4 pt-8 pb-12">
      <header className="rule-bottom pb-6 mb-8">
        <div className="kicker text-muted mb-2">Section</div>
        <h1 className="headline text-4xl md:text-5xl mb-3">{category.name}</h1>
        <p className="dek text-base md:text-lg max-w-3xl">{category.description}</p>
        <nav aria-label="Subcategories" className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
          {category.subcategories.map((s) => (
            <Link
              key={s.slug}
              href={`/${category.slug}/${s.slug}`}
              className="text-sm text-ink hover:text-accent underline-offset-4 hover:underline"
            >
              {s.name}
            </Link>
          ))}
        </nav>
      </header>

      {lead ? (
        <section className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-10">
          <div className="md:col-span-8">
            <ArticleCard article={lead} variant="lead" />
          </div>
          <div className="md:col-span-4 md:border-l md:border-rule md:pl-6 space-y-5">
            {rest.slice(0, 3).map((a) => (
              <div key={a.id} className="rule-bottom pb-4">
                <ArticleCard article={a} variant="compact" showImage={false} />
              </div>
            ))}
            <AdSlot slot={`${category.slug}-rail-top`} />
          </div>
        </section>
      ) : null}

      {rest.length > 3 ? (
        <section>
          <h2 className="kicker mb-6">More in {category.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-10">
            {rest.slice(3).map((a, i) => (
              <div key={a.id} className="contents">
                <ArticleCard article={a} />
                {i === 5 ? (
                  <div className="md:col-span-3">
                    <AdSlot slot={`${category.slug}-mid-banner`} format="horizontal" />
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
