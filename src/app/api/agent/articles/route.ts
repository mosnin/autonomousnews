import { NextRequest, NextResponse } from "next/server";
import { adminApiAuthorized } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { findCategory } from "@/lib/taxonomy";
import { pingIndexNow } from "@/lib/indexnow";
import { SITE } from "@/lib/site";

// Living-article aware article writer.
//
// Behavior:
// - If body.topic_key matches an existing article, UPDATE it in place
//   (preserves slug, author, original published_at; bumps update_count;
//   sets last_updated_by_run; refreshes updated_at via trigger).
// - Otherwise INSERT a new article.
//
// On publish, fires an IndexNow ping to surface the URL to Bing/Yandex
// and links the produced article to the originating agent_run.
export async function POST(req: NextRequest) {
  if (!adminApiAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "supabase not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid json" }, { status: 400 });

  const required = ["slug", "title", "body", "category_slug"];
  for (const k of required) {
    if (!body[k]) {
      return NextResponse.json({ error: `missing ${k}` }, { status: 400 });
    }
  }

  const category = findCategory(body.category_slug);
  if (!category) {
    return NextResponse.json({ error: "unknown category_slug" }, { status: 400 });
  }
  if (
    body.subcategory_slug &&
    !category.subcategories.some((s) => s.slug === body.subcategory_slug)
  ) {
    return NextResponse.json(
      { error: "unknown subcategory_slug for category" },
      { status: 400 }
    );
  }

  const status: "draft" | "scheduled" | "published" | "archived" =
    body.status ?? "draft";
  const nowIso = new Date().toISOString();

  type ExistingArticle = {
    id: string;
    slug: string;
    category_slug: string;
    published_at: string | null;
    update_count: number;
    author_slug: string;
    author_name: string;
  };
  let existing: ExistingArticle | null = null;
  if (body.topic_key) {
    const { data } = await supabase
      .from("articles")
      .select(
        "id, slug, category_slug, published_at, update_count, author_slug, author_name"
      )
      .eq("topic_key", body.topic_key)
      .maybeSingle();
    if (data) {
      existing = data as unknown as ExistingArticle;
    }
  }

  // Shared field projection used by both branches.
  const sourceUrls: string[] = body.source_urls ?? [];

  let articleId: string;
  let canonicalSlug: string;
  let isNew = false;

  if (existing) {
    // ---- LIVING UPDATE ---------------------------------------------------
    // Merge incoming source_urls with existing ones (the writer may have
    // added a fresh source). Dedupe.
    const { data: prev } = await supabase
      .from("articles")
      .select("source_urls")
      .eq("id", existing.id)
      .maybeSingle();
    const prevSources: string[] =
      (prev as { source_urls?: string[] } | null)?.source_urls ?? [];
    const mergedSources = Array.from(new Set([...prevSources, ...sourceUrls]));

    const update = {
      title: body.title,
      dek: body.dek ?? null,
      body: body.body,
      excerpt: body.excerpt ?? null,
      cover_image_url: body.cover_image_url ?? null,
      cover_image_alt: body.cover_image_alt ?? null,
      // Keep the original category / slug / author / published_at so the
      // canonical URL is stable across updates.
      subcategory_slug: body.subcategory_slug ?? null,
      tags: body.tags ?? [],
      source_urls: mergedSources,
      status,
      read_minutes: body.read_minutes ?? 6,
      is_featured: body.is_featured ?? false,
      is_breaking: body.is_breaking ?? false,
      seo_title: body.seo_title ?? null,
      seo_description: body.seo_description ?? null,
      seo_keywords: body.seo_keywords ?? [],
      image_credit: body.image_credit ?? null,
      image_source_url: body.image_source_url ?? null,
      image_is_ai_generated: !!body.image_is_ai_generated,
      image_provider: body.image_provider ?? null,
      model_used: body.model_used ?? null,
      prompt_tokens: body.prompt_tokens ?? null,
      completion_tokens: body.completion_tokens ?? null,
      generation_cost_usd: body.generation_cost_usd ?? null,
      update_count: (existing.update_count ?? 0) + 1,
      last_updated_by_run: body.run_id ?? null,
      // Only set published_at the first time we transition to published.
      published_at:
        existing.published_at ??
        (status === "published" ? nowIso : null),
    };

    const { error: updErr } = await supabase
      .from("articles")
      .update(update)
      .eq("id", existing.id);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
    articleId = existing.id;
    canonicalSlug = existing.slug;

    // Record a story_updates entry so readers see a timeline of revisions.
    const summary = body.update_summary
      ? String(body.update_summary).slice(0, 280)
      : body.dek
      ? String(body.dek).slice(0, 280)
      : "Updated with new reporting.";
    await supabase
      .from("story_updates")
      .insert({
        article_id: articleId,
        summary,
        run_id: body.run_id ?? null,
      })
      .then(() => undefined, () => undefined);
  } else {
    // ---- FRESH INSERT ----------------------------------------------------
    const insert = {
      slug: body.slug,
      title: body.title,
      dek: body.dek ?? null,
      body: body.body,
      excerpt: body.excerpt ?? null,
      cover_image_url: body.cover_image_url ?? null,
      cover_image_alt: body.cover_image_alt ?? null,
      category_slug: body.category_slug,
      subcategory_slug: body.subcategory_slug ?? null,
      tags: body.tags ?? [],
      author_name: body.author_name ?? "Techno Times Staff",
      author_slug: body.author_slug ?? "techno-times-staff",
      source_urls: sourceUrls,
      status,
      read_minutes: body.read_minutes ?? 6,
      is_featured: !!body.is_featured,
      is_breaking: !!body.is_breaking,
      seo_title: body.seo_title ?? null,
      seo_description: body.seo_description ?? null,
      seo_keywords: body.seo_keywords ?? [],
      published_at:
        body.published_at ?? (status === "published" ? nowIso : null),
      topic_key: body.topic_key ?? null,
      image_credit: body.image_credit ?? null,
      image_source_url: body.image_source_url ?? null,
      image_is_ai_generated: !!body.image_is_ai_generated,
      image_provider: body.image_provider ?? null,
      model_used: body.model_used ?? null,
      prompt_tokens: body.prompt_tokens ?? null,
      completion_tokens: body.completion_tokens ?? null,
      generation_cost_usd: body.generation_cost_usd ?? null,
      last_updated_by_run: body.run_id ?? null,
      ai_disclosed: body.ai_disclosed ?? true,
    };

    const { data: inserted, error } = await supabase
      .from("articles")
      .insert(insert)
      .select("id")
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    articleId = (inserted as { id: string }).id;
    canonicalSlug = insert.slug;
    isNew = true;
  }

  if (body.run_id) {
    // Idempotent — same (run_id, article_id) is allowed via primary key
    // collision; ignore the error.
    await supabase
      .from("agent_run_articles")
      .insert({ run_id: body.run_id, article_id: articleId })
      .then(() => undefined, () => undefined);
  }

  if (status === "published") {
    const url = `${SITE.url}/${body.category_slug}/${canonicalSlug}`;
    pingIndexNow([url]).catch(() => undefined);
  }

  return NextResponse.json({ id: articleId, updated: !isNew, slug: canonicalSlug });
}
