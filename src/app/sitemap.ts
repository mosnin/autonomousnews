import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/taxonomy";
import { SITE } from "@/lib/site";
import {
  getLatestArticles,
  getSubcategoryPillarUpdatedAtMap,
  getSubcategoryLatestPublishedAtMap,
} from "@/lib/articles";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url;
  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/about-our-ai`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/agents`, lastModified: now, changeFrequency: "hourly", priority: 0.5 },
    { url: `${base}/feed.xml`, lastModified: now, changeFrequency: "hourly", priority: 0.5 },
  ];

  // Pull pillar.updated_at and the latest article.published_at per
  // subcategory so we can advertise the most recent meaningful change as
  // <lastmod>. Both queries are bounded and run in parallel.
  const [pillarUpdated, subcatLatest, articles] = await Promise.all([
    getSubcategoryPillarUpdatedAtMap(),
    getSubcategoryLatestPublishedAtMap(),
    getLatestArticles(500),
  ]);

  const categoryUrls: MetadataRoute.Sitemap = CATEGORIES.flatMap((c) => [
    {
      url: `${base}/${c.slug}`,
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.8,
    },
    ...c.subcategories.map((s) => {
      const key = `${c.slug}/${s.slug}`;
      const pillarTs = pillarUpdated.get(key);
      const articleTs = subcatLatest.get(key);
      const candidates: number[] = [];
      if (pillarTs) candidates.push(Date.parse(pillarTs));
      if (articleTs) candidates.push(Date.parse(articleTs));
      const lastModified =
        candidates.length > 0
          ? new Date(Math.max(...candidates))
          : now;
      return {
        url: `${base}/${c.slug}/${s.slug}`,
        lastModified,
        changeFrequency: "hourly" as const,
        priority: 0.6,
      };
    }),
  ]);

  const articleUrls: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${base}/${a.category_slug}/${a.slug}`,
    lastModified: a.published_at ? new Date(a.published_at) : now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticUrls, ...categoryUrls, ...articleUrls];
}
