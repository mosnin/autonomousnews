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
      return `    <item>
      <title>${esc(a.title)}</title>
      <link>${esc(url)}</link>
      <guid isPermaLink="true">${esc(url)}</guid>
      <pubDate>${pub}</pubDate>
      <description>${cdata(desc)}</description>
      <dc:creator>${esc(a.author_name)}</dc:creator>
      <category>${esc(a.category_slug)}</category>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:dc="http://purl.org/dc/elements/1.1/">
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
