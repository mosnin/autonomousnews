import { NextResponse } from "next/server";
import { getArticlesByCategory } from "@/lib/articles";
import { PLACEHOLDER_ARTICLES } from "@/lib/placeholder";
import { findCategory } from "@/lib/taxonomy";
import { renderRssFeed } from "@/lib/rss";
import { SITE } from "@/lib/site";

export const revalidate = 300;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ category: string }> }
) {
  const { category: slug } = await params;
  const category = findCategory(slug);
  if (!category) {
    return new NextResponse("Not found", { status: 404 });
  }

  let articles = await getArticlesByCategory(category.slug, 50);
  if (articles.length === 0) {
    articles = PLACEHOLDER_ARTICLES.filter((a) => a.category_slug === category.slug);
  }

  const xml = renderRssFeed({
    title: `${SITE.name} — ${category.name}`,
    description: category.description,
    selfPath: `/${category.slug}/feed.xml`,
    articles,
  });

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
