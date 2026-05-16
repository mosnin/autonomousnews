import { NextRequest, NextResponse } from "next/server";
import { adminApiAuthorized } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { findSubcategory } from "@/lib/taxonomy";
import { pingIndexNow } from "@/lib/indexnow";
import { SITE } from "@/lib/site";

// Upsert a subcategory pillar (the evergreen 'topic guide' rendered above
// the article grid on /<category>/<subcategory>). Idempotent on
// (category_slug, subcategory_slug). Fires an IndexNow ping for the
// affected URL so search engines re-fetch when the guide refreshes.
export async function POST(req: NextRequest) {
  if (!adminApiAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "supabase not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.category_slug || !body?.subcategory_slug) {
    return NextResponse.json(
      { error: "missing category_slug or subcategory_slug" },
      { status: 400 }
    );
  }
  if (!body.title || !body.overview || !body.body) {
    return NextResponse.json(
      { error: "missing title, overview, or body" },
      { status: 400 }
    );
  }
  // Validate against taxonomy so we never accept a pillar for an unknown URL.
  const sub = findSubcategory(body.category_slug, body.subcategory_slug);
  if (!sub) {
    return NextResponse.json(
      { error: "unknown category/subcategory pair" },
      { status: 400 }
    );
  }

  const row = {
    category_slug: body.category_slug,
    subcategory_slug: body.subcategory_slug,
    title: body.title,
    dek: body.dek ?? null,
    overview: body.overview,
    body: body.body,
    why_it_matters: body.why_it_matters ?? null,
    focus_keyword: body.focus_keyword ?? null,
    long_tail_keywords: body.long_tail_keywords ?? [],
    power_word: body.power_word ?? null,
    seo_title: body.seo_title ?? null,
    seo_description: body.seo_description ?? null,
    key_terms: body.key_terms ?? null,
    timeline: body.timeline ?? null,
    faq: body.faq ?? null,
    related_subcategories: body.related_subcategories ?? [],
    model_used: body.model_used ?? null,
    prompt_tokens: body.prompt_tokens ?? null,
    completion_tokens: body.completion_tokens ?? null,
    generation_cost_usd: body.generation_cost_usd ?? null,
    last_updated_by_run: body.run_id ?? null,
    generated_at: body.generated_at ?? new Date().toISOString(),
  };

  const { error } = await supabase
    .from("subcategory_pillars")
    .upsert(row, { onConflict: "category_slug,subcategory_slug" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.run_id) {
    await supabase
      .from("agent_run_pillars")
      .insert({
        run_id: body.run_id,
        category_slug: body.category_slug,
        subcategory_slug: body.subcategory_slug,
      })
      .then(() => undefined, () => undefined);
  }

  // Tell search engines the subcategory page just got refreshed content.
  pingIndexNow([`${SITE.url}/${body.category_slug}/${body.subcategory_slug}`]).catch(
    () => undefined
  );

  return NextResponse.json({ ok: true });
}
