import { NextRequest, NextResponse } from "next/server";
import { adminApiAuthorized } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { findCategory } from "@/lib/taxonomy";
import { pingIndexNow } from "@/lib/indexnow";
import { SITE } from "@/lib/site";

// Insert an article produced by the agent worker and link it to its run.
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

  const status = body.status ?? "draft";
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
    author_name: body.author_name ?? "Techno Times AI",
    author_slug: body.author_slug ?? "techno-times-ai",
    source_urls: body.source_urls ?? [],
    status,
    read_minutes: body.read_minutes ?? 3,
    is_featured: !!body.is_featured,
    is_breaking: !!body.is_breaking,
    seo_title: body.seo_title ?? null,
    seo_description: body.seo_description ?? null,
    seo_keywords: body.seo_keywords ?? [],
    published_at:
      body.published_at ?? (status === "published" ? new Date().toISOString() : null),
  };

  const { data: inserted, error } = await supabase
    .from("articles")
    .insert(insert)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.run_id && inserted) {
    await supabase
      .from("agent_run_articles")
      .insert({ run_id: body.run_id, article_id: (inserted as { id: string }).id });
  }

  if (status === "published") {
    const url = `${SITE.url}/${insert.category_slug}/${insert.slug}`;
    // Fire-and-forget; IndexNow result lives in logs if you care to log it.
    pingIndexNow([url]).catch(() => undefined);
  }

  return NextResponse.json({ id: (inserted as { id: string }).id });
}
