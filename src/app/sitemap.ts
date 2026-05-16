import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/taxonomy";
import { AUTHORS } from "@/lib/authors";
import { SITE } from "@/lib/site";
import { getLatestArticles } from "@/lib/articles";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url;
  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/about-our-ai`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/feed.xml`, lastModified: now, changeFrequency: "hourly", priority: 0.5 },
  ];

  const categoryUrls: MetadataRoute.Sitemap = CATEGORIES.flatMap((c) => [
    {
      url: `${base}/${c.slug}`,
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.8,
    },
    ...c.subcategories.map((s) => ({
      url: `${base}/${c.slug}/${s.slug}`,
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.6,
    })),
  ]);

  const authorUrls: MetadataRoute.Sitemap = AUTHORS.map((a) => ({
    url: `${base}/by/${a.slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.5,
  }));

  const articles = await getLatestArticles(500);
  const articleUrls: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${base}/${a.category_slug}/${a.slug}`,
    lastModified: a.published_at ? new Date(a.published_at) : now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticUrls, ...categoryUrls, ...authorUrls, ...articleUrls];
}
