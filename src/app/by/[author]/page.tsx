import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { AUTHORS, findAuthor } from "@/lib/authors";
import { findCategory } from "@/lib/taxonomy";
import { getArticlesByAuthor } from "@/lib/articles";
import { PLACEHOLDER_ARTICLES } from "@/lib/placeholder";
import ArticleCard from "@/components/ArticleCard";
import { SITE } from "@/lib/site";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sectionColor } from "@/lib/sectionColors";

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

function tenureLabel(joinedAt: string): string {
  // joinedAt: 'YYYY-MM'
  const [y, m] = joinedAt.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

async function loadProfileExtras(slug: string): Promise<{
  portraitUrl: string | null;
  storyCount: number;
}> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { portraitUrl: null, storyCount: 0 };
  const [profile, count] = await Promise.all([
    supabase
      .from("author_profiles")
      .select("portrait_url")
      .eq("slug", slug)
      .maybeSingle(),
    supabase
      .from("articles")
      .select("id", { head: true, count: "exact" })
      .eq("status", "published")
      .eq("author_slug", slug),
  ]);
  return {
    portraitUrl:
      (profile.data as { portrait_url?: string } | null)?.portrait_url ?? null,
    storyCount: count.count ?? 0,
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

  const { portraitUrl, storyCount } = await loadProfileExtras(author.slug);
  const firstBeat = author.beat[0];
  const c = sectionColor(firstBeat ?? "opinion");

  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    jobTitle: author.title,
    description: author.bio,
    url: `${SITE.url}/by/${author.slug}`,
    image: portraitUrl ?? undefined,
    sameAs: [
      author.links?.x ? `https://x.com/${author.links.x}` : null,
      author.links?.linkedin
        ? `https://linkedin.com/in/${author.links.linkedin}`
        : null,
      author.links?.mastodon ?? null,
      author.links?.web ?? null,
    ].filter(Boolean),
    worksFor: { "@type": "NewsMediaOrganization", name: SITE.name },
  };

  const lead = articles[0];
  const rest = articles.slice(1);

  return (
    <div
      className="max-w-content mx-auto px-4 md:px-8 pt-6 md:pt-10 pb-16"
      style={{
        ["--section" as never]: c.bg,
        ["--section-text" as never]: c.fg,
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }}
      />

      {/* Hero */}
      <header className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 md:gap-12 items-start rule-bottom pb-10 md:pb-12 mb-12">
        <div className="md:sticky md:top-32">
          {portraitUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={portraitUrl}
              alt={author.name}
              className="w-32 h-32 md:w-48 md:h-48 rounded-full object-cover border-4 border-rule"
            />
          ) : (
            <div
              className="w-32 h-32 md:w-48 md:h-48 rounded-full flex items-center justify-center text-paper text-5xl font-display font-bold border-4 border-rule"
              style={{ background: c.bg }}
            >
              {author.initials}
            </div>
          )}
        </div>
        <div>
          <div className="section-ribbon" />
          <div className="kicker mb-2">Reporter</div>
          <h1 className="headline text-4xl md:text-6xl mb-3">{author.name}</h1>
          <p className="byline text-base md:text-lg uppercase tracking-kicker mb-4">
            {author.title}
          </p>
          <p className="dek text-base md:text-lg mb-5 max-w-2xl">{author.bio}</p>

          <div className="text-sm font-sans text-muted mb-5">
            Covering{" "}
            {author.beat
              .map((b) => findCategory(b)?.name ?? b)
              .join(", ")}{" "}
            at {SITE.name} since {tenureLabel(author.joinedAt)}
            {storyCount > 0 ? ` · ${storyCount} stories` : ""}
          </div>

          <div className="flex flex-wrap gap-3">
            {author.beat.map((b) => {
              const cat = findCategory(b);
              if (!cat) return null;
              return (
                <Link
                  key={b}
                  href={`/${cat.slug}`}
                  className="text-xs uppercase tracking-kicker border border-rule px-2 py-1 hover:bg-wash font-sans"
                >
                  {cat.name}
                </Link>
              );
            })}
          </div>

          {(author.links?.x ||
            author.links?.linkedin ||
            author.links?.mastodon ||
            author.links?.web) && (
            <div className="flex flex-wrap gap-4 mt-5 text-sm font-sans">
              {author.links?.x ? (
                <a
                  href={`https://x.com/${author.links.x}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  X / Twitter
                </a>
              ) : null}
              {author.links?.linkedin ? (
                <a
                  href={`https://linkedin.com/in/${author.links.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  LinkedIn
                </a>
              ) : null}
              {author.links?.mastodon ? (
                <a
                  href={author.links.mastodon}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  Mastodon
                </a>
              ) : null}
              {author.links?.web ? (
                <a
                  href={author.links.web}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  Personal site
                </a>
              ) : null}
            </div>
          )}
        </div>
      </header>

      {articles.length === 0 ? (
        <p className="dek">No articles by {author.name} yet.</p>
      ) : (
        <>
          {lead ? (
            <section className="mb-14">
              <h2 className="kicker mb-6">Latest</h2>
              <ArticleCard article={lead} variant="lead" priority />
            </section>
          ) : null}

          {rest.length > 0 ? (
            <section>
              <h2 className="kicker mb-6">More by {author.name}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-12">
                {rest.map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
