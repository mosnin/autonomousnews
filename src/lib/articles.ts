import { createSupabaseServerClient } from "./supabase/server";
import type { Article } from "./supabase/types";

export type ArticleSummary = Pick<
  Article,
  | "id"
  | "slug"
  | "title"
  | "dek"
  | "excerpt"
  | "cover_image_url"
  | "cover_image_alt"
  | "category_slug"
  | "subcategory_slug"
  | "author_name"
  | "author_slug"
  | "is_breaking"
  | "is_featured"
  | "is_live"
  | "published_at"
  | "read_minutes"
>;

const SUMMARY_COLUMNS = [
  "id",
  "slug",
  "title",
  "dek",
  "excerpt",
  "cover_image_url",
  "cover_image_alt",
  "category_slug",
  "subcategory_slug",
  "author_name",
  "author_slug",
  "is_breaking",
  "is_featured",
  "is_live",
  "published_at",
  "read_minutes",
].join(", ");

export async function getLatestArticles(limit = 20): Promise<ArticleSummary[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("articles")
    .select(SUMMARY_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as unknown as ArticleSummary[];
}

export async function getFeaturedArticles(limit = 5): Promise<ArticleSummary[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("articles")
    .select(SUMMARY_COLUMNS)
    .eq("status", "published")
    .eq("is_featured", true)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as unknown as ArticleSummary[];
}

export async function getArticlesByCategory(
  categorySlug: string,
  limit = 20
): Promise<ArticleSummary[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("articles")
    .select(SUMMARY_COLUMNS)
    .eq("status", "published")
    .eq("category_slug", categorySlug)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as unknown as ArticleSummary[];
}

export async function getArticlesBySubcategory(
  categorySlug: string,
  subcategorySlug: string,
  limit = 20
): Promise<ArticleSummary[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("articles")
    .select(SUMMARY_COLUMNS)
    .eq("status", "published")
    .eq("category_slug", categorySlug)
    .eq("subcategory_slug", subcategorySlug)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as unknown as ArticleSummary[];
}

export async function getArticlesByAuthor(
  authorSlug: string,
  limit = 30
): Promise<ArticleSummary[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("articles")
    .select(SUMMARY_COLUMNS)
    .eq("status", "published")
    .eq("author_slug", authorSlug)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as unknown as ArticleSummary[];
}

export async function getMostReadArticles(limit = 5): Promise<ArticleSummary[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("most_read_articles")
    .select(SUMMARY_COLUMNS)
    .limit(limit);
  if (error) return [];
  return (data ?? []) as unknown as ArticleSummary[];
}

export async function getArticlesByTag(tag: string, limit = 30): Promise<ArticleSummary[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("articles")
    .select(SUMMARY_COLUMNS)
    .eq("status", "published")
    .contains("tags", [tag])
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as unknown as ArticleSummary[];
}

export async function getLiveArticles(limit = 5): Promise<ArticleSummary[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("articles")
    .select(SUMMARY_COLUMNS)
    .eq("status", "published")
    .eq("is_live", true)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as unknown as ArticleSummary[];
}

export async function getBreakingHeadlines(limit = 5): Promise<ArticleSummary[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("articles")
    .select(SUMMARY_COLUMNS)
    .eq("status", "published")
    .or("is_breaking.eq.true,is_live.eq.true")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as unknown as ArticleSummary[];
}

export async function getStoryUpdates(articleId: string): Promise<
  Array<{ id: number; summary: string; created_at: string }>
> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("story_updates")
    .select("id, summary, created_at")
    .eq("article_id", articleId)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as Array<{ id: number; summary: string; created_at: string }>;
}

export async function searchArticles(
  q: string,
  limit = 30
): Promise<ArticleSummary[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase || !q.trim()) return [];
  const pattern = `%${q.replace(/[%_]/g, "")}%`;
  const { data, error } = await supabase
    .from("articles")
    .select(SUMMARY_COLUMNS)
    .eq("status", "published")
    .or(`title.ilike.${pattern},dek.ilike.${pattern},excerpt.ilike.${pattern}`)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as unknown as ArticleSummary[];
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error || !data) return null;
  return data as Article;
}

// Tag-aware "related stories": same category, ranked by tag overlap with the
// source article. Falls back to recency when no tags match.
export async function getRelatedArticles(
  article: {
    id: string;
    category_slug: string;
    subcategory_slug: string | null;
    tags: string[];
  },
  limit = 4
): Promise<ArticleSummary[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  // Pull a wider candidate pool from the same category, then score by tag
  // overlap in JS. This avoids GIN-only operators that depend on extensions
  // not always present on Supabase free tier.
  const { data, error } = await supabase
    .from("articles")
    .select(`${SUMMARY_COLUMNS}, tags`)
    .eq("status", "published")
    .eq("category_slug", article.category_slug)
    .neq("id", article.id)
    .order("published_at", { ascending: false })
    .limit(40);
  if (error || !data) return [];

  const rows = data as unknown as Array<ArticleSummary & { tags: string[] }>;
  const tagSet = new Set(article.tags ?? []);

  const scored = rows.map((r) => {
    const overlap = (r.tags ?? []).reduce(
      (n, t) => n + (tagSet.has(t) ? 1 : 0),
      0
    );
    const sameSub =
      article.subcategory_slug != null &&
      r.subcategory_slug === article.subcategory_slug
        ? 1
        : 0;
    return { row: r, score: overlap * 10 + sameSub };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const ta = a.row.published_at ? Date.parse(a.row.published_at) : 0;
    const tb = b.row.published_at ? Date.parse(b.row.published_at) : 0;
    return tb - ta;
  });

  return scored.slice(0, limit).map(({ row }) => {
    const { tags: _tags, ...rest } = row;
    return rest as ArticleSummary;
  });
}

export async function getRecentArticlesForNewsSitemap(
  hours = 48
): Promise<Pick<Article, "slug" | "title" | "category_slug" | "published_at" | "seo_keywords">[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const since = new Date(Date.now() - hours * 3600_000).toISOString();
  const { data, error } = await supabase
    .from("articles")
    .select("slug, title, category_slug, published_at, seo_keywords")
    .eq("status", "published")
    .gte("published_at", since)
    .order("published_at", { ascending: false })
    .limit(1000);
  if (error) return [];
  return (data ?? []) as unknown as Pick<
    Article,
    "slug" | "title" | "category_slug" | "published_at" | "seo_keywords"
  >[];
}
