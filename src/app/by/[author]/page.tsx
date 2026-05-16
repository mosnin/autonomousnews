import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { AUTHORS, findAuthor } from "@/lib/authors";
import { findCategory } from "@/lib/taxonomy";
import { getArticlesByAuthor } from "@/lib/articles";
import { PLACEHOLDER_ARTICLES } from "@/lib/placeholder";
import ArticleCard from "@/components/ArticleCard";
import { SITE } from "@/lib/site";

export const revalidate = 300;

export function generateStaticParams() {
  return AUTHORS.map((a) => ({ author: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ author: string }>;
}): Promise<Metadata> {
  const { author: slug } = await params;
  const author = findAuthor(slug);
  if (!author) return {};
  return {
    title: `${author.name} — ${author.title}`,
    description: author.bio,
    alternates: { canonical: `/by/${author.slug}` },
    openGraph: {
      title: `${author.name} | ${SITE.name}`,
      description: author.bio,
      url: `${SITE.url}/by/${author.slug}`,
      type: "profile",
    },
  };
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ author: string }>;
}) {
  const { author: slug } = await params;
  const author = findAuthor(slug);
  if (!author) notFound();

  let articles = await getArticlesByAuthor(author.slug, 30);
  if (articles.length === 0) {
    articles = PLACEHOLDER_ARTICLES.filter((a) => a.author_slug === author.slug);
  }

  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    jobTitle: author.title,
    description: author.bio,
    url: `${SITE.url}/by/${author.slug}`,
    worksFor: { "@type": "NewsMediaOrganization", name: SITE.name },
  };

  return (
    <div className="max-w-content mx-auto px-4 pt-10 pb-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }}
      />
      <header className="rule-bottom pb-8 mb-8 flex flex-col md:flex-row gap-6 md:items-center">
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-ink text-white flex items-center justify-center text-2xl font-bold font-sans flex-shrink-0">
          {author.initials}
        </div>
        <div>
          <div className="kicker text-muted mb-1">By</div>
          <h1 className="headline text-3xl md:text-4xl mb-1">{author.name}</h1>
          <div className="byline text-base">{author.title}</div>
          <p className="dek mt-3 max-w-2xl">{author.bio}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {author.beat.map((b) => {
              const cat = findCategory(b);
              if (!cat) return null;
              return (
                <Link
                  key={b}
                  href={`/${cat.slug}`}
                  className="text-xs uppercase tracking-widest border border-rule px-2 py-1 hover:bg-wash"
                >
                  {cat.name}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {articles.length === 0 ? (
        <p className="dek">No articles by {author.name} yet.</p>
      ) : (
        <section>
          <h2 className="kicker mb-6">Latest by {author.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-10">
            {articles.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
