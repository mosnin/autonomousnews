import { NextResponse } from "next/server";
import { getLatestArticles } from "@/lib/articles";
import { PLACEHOLDER_ARTICLES } from "@/lib/placeholder";
import { renderRssFeed } from "@/lib/rss";
import { SITE } from "@/lib/site";

export const revalidate = 300;

export async function GET() {
  let articles = await getLatestArticles(50);
  if (articles.length === 0) articles = PLACEHOLDER_ARTICLES.slice(0, 20);

  const xml = renderRssFeed({
    title: `${SITE.name} — Latest`,
    description: SITE.description,
    selfPath: "/feed.xml",
    articles,
  });

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
