import { NextResponse } from "next/server";
import { getRecentArticlesForNewsSitemap } from "@/lib/articles";
import { SITE } from "@/lib/site";

export const revalidate = 300;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const articles = await getRecentArticlesForNewsSitemap(48);

  const urls = articles
    .filter((a) => !!a.published_at)
    .map((a) => {
      const loc = `${SITE.url}/${a.category_slug}/${a.slug}`;
      const keywords = (a.seo_keywords ?? []).join(", ");
      return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(SITE.name)}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${a.published_at}</news:publication_date>
      <news:title>${escapeXml(a.title)}</news:title>${
        keywords ? `\n      <news:keywords>${escapeXml(keywords)}</news:keywords>` : ""
      }
    </news:news>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
