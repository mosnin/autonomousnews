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
  | "is_breaking"
  | "is_featured"
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
  "is_breaking",
  "is_featured",
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
