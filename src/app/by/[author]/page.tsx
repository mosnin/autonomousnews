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
import { breadcrumbListLd } from "@/lib/jsonld";
import { authorPortraitAlt } from "@/lib/imageAlt";

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
  const { portraitUrl } = await loadProfileExtras(slug);
  const ogImages = portraitUrl ? [{ url: portraitUrl }] : undefined;
  return {
    title: `${author.name} – ${SITE.name}`,
    description: author.bio,
    alternates: { canonical: `/by/${author.slug}` },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${author.name} – ${SITE.name}`,
      description: author.bio,
      url: `${SITE.url}/by/${author.slug}`,
      type: "profile",
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: `${author.name} – ${SITE.name}`,
      description: author.bio,
      images: portraitUrl ? [portraitUrl] : undefined,
    },
  };
}

// Format YYYY-MM (or an ISO timestamp from author_profiles.joined_at)
// into "Month YYYY" for the tenure copy.
function tenureLabel(joinedAt: string): string {
  const m = joinedAt.match(/^(\d{4})-(\d{2})/);
  if (!m) return joinedAt;
  const [, yStr, mStr] = m;
  const d = new Date(Number(yStr), Number(mStr) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

type ProfileExtras = {
  portraitUrl: string | null;
  storyCount: number;
  joinedAtDb: string | null;
  links: {
    x: string | null;
    linkedin: string | null;
    mastodon: string | null;
    web: string | null;
  };
};

// Pull portrait + social link overrides + story count from Supabase in
// a single round trip. The in-memory roster (src/lib/authors.ts) is the
// source of truth for the persona; author_profiles is the source of
// truth for the editorial portrait + verified social handles managed
// via /admin/authors.
async function loadProfileExtras(slug: string): Promise<ProfileExtras> {
  const empty: ProfileExtras = {
    portraitUrl: null,
    storyCount: 0,
    joinedAtDb: null,
    links: { x: null, linkedin: null, mastodon: null, web: null },
  };
  const supabase = getSupabaseAdmin();
  if (!supabase) return empty;
  const [profile, count] = await Promise.all([
    supabase
      .from("author_profiles")
      .select(
        "portrait_url, joined_at, link_x, link_linkedin, link_mastodon, link_web"
      )
      .eq("slug", slug)
      .maybeSingle(),
    supabase
      .from("articles")
      .select("id", { head: true, count: "exact" })
      .eq("status", "published")
      .eq("author_slug", slug),
  ]);
  const row = profile.data as {
    portrait_url?: string | null;
    joined_at?: string | null;
    link_x?: string | null;
    link_linkedin?: string | null;
    link_mastodon?: string | null;
    link_web?: string | null;
  } | null;
  return {
    portraitUrl: row?.portrait_url ?? null,
    storyCount: count.count ?? 0,
    joinedAtDb: row?.joined_at ?? null,
    links: {
      x: row?.link_x ?? null,
      linkedin: row?.link_linkedin ?? null,
      mastodon: row?.link_mastodon ?? null,
      web: row?.link_web ?? null,
    },
  };
}

// Normalize a stored value to a URL. Editors can save either a bare
// handle ("mira_chen") or a full URL ("https://x.com/mira_chen") in
// the admin form; either should resolve here.
function xUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://x.com/${v.replace(/^@/, "")}`;
}

function linkedinUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://linkedin.com/in/${v}`;
}

function plainUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

// Inline social SVGs kept here (not in a library) so the page stays a
// pure RSC with no extra JS. Icons are 16px and marked aria-hidden —
// the parent <a> carries the aria-label.
function IconX() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M18.244 2H21.5l-7.5 8.575L23 22h-6.844l-5.36-7.02L4.6 22H1.34l8.02-9.17L1 2h7.02l4.85 6.41L18.244 2Zm-2.4 18h1.89L7.24 4H5.24l10.605 16Z" />
    </svg>
  );
}
function IconLinkedIn() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5ZM.22 8.13h4.56V23H.22V8.13Zm7.4 0h4.37v2.04h.06c.61-1.15 2.1-2.37 4.32-2.37 4.62 0 5.47 3.04 5.47 7v8.2h-4.56v-7.27c0-1.74-.03-3.97-2.42-3.97-2.42 0-2.79 1.89-2.79 3.84V23H7.62V8.13Z" />
    </svg>
  );
}
function IconMastodon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M21.58 6.19c-.33-2.4-2.46-4.3-5-4.67C16.16 1.46 14.55 1.27 12 1.27h-.02c-2.55 0-4.16.19-4.58.25-2.54.37-4.67 2.27-5 4.67-.32 2.3-.36 5.29.5 8.96.93 3.97 4.34 5.49 7.55 5.65 1.04.05 2.05.02 3.05-.1l.16-.02v-2.2l-.18.04c-1.13.12-2.34.16-3.5.02-1.99-.24-3.36-1.5-3.43-3.4 0 0 1.41.59 3.45.69 1.24.06 2.43-.02 3.65-.18 2.36-.3 4.4-1.78 4.66-3.14.4-2.15.37-5.24.27-6.1Zm-3.07 6.34h-2.16V7.31c0-1.1-.46-1.65-1.4-1.65-1.03 0-1.55.67-1.55 2v2.9h-2.14v-2.9c0-1.33-.51-2-1.55-2-.93 0-1.4.55-1.4 1.65v5.22H6.16V7.15c0-1.1.28-1.97.84-2.62.58-.65 1.34-.98 2.29-.98 1.1 0 1.92.42 2.46 1.26l.54.91.54-.91c.54-.84 1.36-1.26 2.45-1.26.94 0 1.7.33 2.28.98.56.65.84 1.52.84 2.62v5.38Z" />
    </svg>
  );
}
function IconGlobe() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" />
    </svg>
  );
}

type SocialKey = "x" | "linkedin" | "mastodon" | "web";

type SocialLink = {
  key: SocialKey;
  href: string;
  label: string;
  Icon: () => React.JSX.Element;
};

function buildSocialLinks(
  rosterLinks: NonNullable<ReturnType<typeof findAuthor>>["links"],
  dbLinks: ProfileExtras["links"]
): SocialLink[] {
  // author_profiles wins when set (editorially curated); fall back to
  // the roster handle.
  const out: SocialLink[] = [];
  const xHref = xUrl(dbLinks.x ?? rosterLinks?.x);
  if (xHref) out.push({ key: "x", href: xHref, label: "X / Twitter", Icon: IconX });
  const liHref = linkedinUrl(dbLinks.linkedin ?? rosterLinks?.linkedin);
  if (liHref)
    out.push({ key: "linkedin", href: liHref, label: "LinkedIn", Icon: IconLinkedIn });
  const mHref = plainUrl(dbLinks.mastodon ?? rosterLinks?.mastodon);
  if (mHref)
    out.push({ key: "mastodon", href: mHref, label: "Mastodon", Icon: IconMastodon });
  const wHref = plainUrl(dbLinks.web ?? rosterLinks?.web);
  if (wHref)
    out.push({ key: "web", href: wHref, label: "Personal site", Icon: IconGlobe });
  return out;
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

  const extras = await loadProfileExtras(author.slug);
  const firstBeat = author.beat[0];
  const c = sectionColor(firstBeat ?? "opinion");
  const joinedAt = extras.joinedAtDb ?? author.joinedAt;
  const socialLinks = buildSocialLinks(author.links, extras.links);

  // schema.org Person — sameAs gets every resolved social URL so
  // search engines can verify identity.
  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    jobTitle: author.title,
    description: author.bio,
    image: extras.portraitUrl ?? undefined,
    url: `${SITE.url}/by/${author.slug}`,
    sameAs: socialLinks.map((l) => l.href),
    worksFor: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
    },
  };

  const breadcrumbs = breadcrumbListLd([
    { name: "Home", url: "/" },
    { name: "Authors", url: "/by" },
    { name: author.name, url: `/by/${author.slug}` },
  ]);

  const portraitAlt = authorPortraitAlt(author);

  // Common focus-ring class for interactive elements on this page —
  // matches the SiteHeader pattern.
  const focusRing =
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      {/* Masthead hero: portrait left, identity right, separated from
          the article grid by a rule. */}
      <header className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-8 md:gap-12 items-start rule-bottom pb-10 md:pb-12 mb-12">
        <div className="md:sticky md:top-32">
          {extras.portraitUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={extras.portraitUrl}
              alt={portraitAlt}
              width={180}
              height={180}
              className="w-36 h-36 md:w-44 md:h-44 rounded-full object-cover border-4 border-rule"
            />
          ) : (
            <div
              className="w-36 h-36 md:w-44 md:h-44 rounded-full flex items-center justify-center text-paper text-5xl font-display font-bold border-4 border-rule"
              style={{ background: c.bg }}
              aria-label={portraitAlt}
              role="img"
            >
              {author.initials}
            </div>
          )}
        </div>
        <div>
          <div className="section-ribbon" />
          <div className="kicker mb-2">Reporter</div>
          <h1 className="headline text-4xl md:text-6xl mb-3">{author.name}</h1>
          <p className="kicker text-xs md:text-sm mb-4">{author.title}</p>
          <p className="dek text-base md:text-lg mb-5 max-w-prose">
            {author.bio}
          </p>

          <p className="byline text-xs md:text-sm text-muted mb-5">
            Reporting at {SITE.name} since {tenureLabel(joinedAt)}
            {extras.storyCount > 0
              ? ` · ${extras.storyCount} ${extras.storyCount === 1 ? "story" : "stories"}`
              : ""}
          </p>

          {author.beat.length > 0 ? (
            <nav
              aria-label={`Beats covered by ${author.name}`}
              className="flex flex-wrap gap-2"
            >
              {author.beat.map((b) => {
                const cat = findCategory(b);
                if (!cat) return null;
                const beatColor = sectionColor(cat.slug);
                return (
                  <Link
                    key={b}
                    href={`/${cat.slug}`}
                    className={`text-[11px] uppercase tracking-kicker border px-2 py-1 font-sans hover:bg-wash transition-colors ${focusRing}`}
                    style={{
                      color: beatColor.fg,
                      borderColor: beatColor.fg,
                    }}
                  >
                    {cat.name}
                  </Link>
                );
              })}
            </nav>
          ) : null}

          {socialLinks.length > 0 ? (
            <ul
              className="flex flex-wrap items-center gap-3 mt-5"
              aria-label={`${author.name} on the web`}
            >
              {socialLinks.map(({ key, href, label, Icon }) => (
                <li key={key}>
                  <a
                    href={href}
                    target="_blank"
                    // rel="me" participates in IndieAuth + Mastodon
                    // identity verification; noopener/noreferrer is
                    // standard for target=_blank.
                    rel="me noopener noreferrer"
                    aria-label={`${author.name} on ${label}`}
                    title={label}
                    className={`inline-flex items-center justify-center w-9 h-9 border border-rule text-ink hover:text-accent hover:border-ink transition-colors ${focusRing}`}
                  >
                    <Icon />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </header>

      <section>
        <h2 className="kicker mb-6">Published articles</h2>
        {articles.length === 0 ? (
          <p className="dek">{author.name} hasn&rsquo;t published yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-12">
            {articles.map((a, i) => (
              <ArticleCard key={a.id} article={a} priority={i === 0} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
