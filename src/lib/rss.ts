import type { ArticleSummary } from "./articles";
import { SITE } from "./site";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(s: string): string {
  return `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

function rfc822(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toUTCString();
}

// Best-effort RFC 2045 mime type guess from URL extension. Defaults to
// image/jpeg — the value RSS readers fall back to when the enclosure type
// is missing or unrecognised.
function guessImageMime(url: string): string {
  const u = url.toLowerCase().split("?")[0];
  if (u.endsWith(".png")) return "image/png";
  if (u.endsWith(".webp")) return "image/webp";
  if (u.endsWith(".gif")) return "image/gif";
  if (u.endsWith(".avif")) return "image/avif";
  if (u.endsWith(".svg")) return "image/svg+xml";
  return "image/jpeg";
}

export function renderRssFeed(opts: {
  title: string;
  description: string;
  selfPath: string;
  articles: ArticleSummary[];
}): string {
  const self = `${SITE.url}${opts.selfPath}`;
  const items = opts.articles
    .map((a) => {
      const url = `${SITE.url}/${a.category_slug}/${a.slug}`;
      const pub = rfc822(a.published_at);
      const desc = a.excerpt || a.dek || "";
      // RSS 2.0 <enclosure> for the cover image + Media RSS <media:content>
      // for readers that prefer Yahoo's richer schema. length="0" because we
      // don't know the byte size at render time; spec-compliant readers
      // tolerate that.
      const cover = a.cover_image_url ?? null;
      const coverMime = cover ? guessImageMime(cover) : null;
      const enclosure = cover && coverMime
        ? `\n      <enclosure url="${esc(cover)}" length="0" type="${coverMime}" />`
        : "";
      const mediaContent = cover && coverMime
        ? `\n      <media:content url="${esc(cover)}" medium="image" type="${coverMime}"${
            a.cover_image_alt ? ` />\n      <media:description type="plain">${esc(a.cover_image_alt)}</media:description>` : " />"
          }`
        : "";
      return `    <item>
      <title>${esc(a.title)}</title>
      <link>${esc(url)}</link>
      <guid isPermaLink="true">${esc(url)}</guid>
      <pubDate>${pub}</pubDate>
      <description>${cdata(desc)}</description>
      <dc:creator>${esc(a.author_name)}</dc:creator>
      <category>${esc(a.category_slug)}</category>${enclosure}${mediaContent}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${esc(opts.title)}</title>
    <link>${esc(SITE.url)}</link>
    <description>${esc(opts.description)}</description>
    <language>en</language>
    <lastBuildDate>${rfc822(opts.articles[0]?.published_at ?? null)}</lastBuildDate>
    <atom:link href="${esc(self)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
}
