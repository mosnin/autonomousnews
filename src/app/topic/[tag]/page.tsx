import type { Metadata } from "next";
import { getArticlesByTag } from "@/lib/articles";
import ArticleCard from "@/components/ArticleCard";
import { SITE } from "@/lib/site";
import { breadcrumbListLd } from "@/lib/jsonld";

export const revalidate = 300;

function readableFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((p) => (p.length <= 3 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1)))
    .join(" ");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const label = readableFromSlug(tag);
  return {
    title: `${label} — Topic`,
    description: `All ${SITE.name} coverage tagged ${label}.`,
    alternates: { canonical: `/topic/${tag}` },
  };
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const label = readableFromSlug(decoded);

  // Try both the slug form and the natural form (writer may have emitted
  // either) so we don't miss tags.
  const articles = await getArticlesByTag(decoded);
  const alt = decoded.replace(/-/g, " ");
  const altArticles =
    alt !== decoded ? await getArticlesByTag(alt) : [];
  const all = [...articles, ...altArticles].filter(
    (a, i, arr) => arr.findIndex((b) => b.id === a.id) === i
  );

  const breadcrumbs = breadcrumbListLd([
    { name: "Home", url: "/" },
    { name: "Topics", url: "/topics" },
    { name: label, url: `/topic/${tag}` },
  ]);

  return (
    <div className="max-w-content mx-auto px-4 md:px-8 pt-8 md:pt-12 pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <header className="rule-bottom pb-8 mb-10">
        <div className="kicker text-muted mb-2">Topic</div>
        <h1 className="headline text-4xl md:text-6xl mb-3">{label}</h1>
        <p className="dek text-base md:text-lg max-w-3xl">
          Every {SITE.name} story tagged{" "}
          <strong>{label}</strong>, newest first.
        </p>
      </header>

      {all.length === 0 ? (
        <p className="dek">No stories yet under this topic.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-12">
          {all.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      )}
    </div>
  );
}
