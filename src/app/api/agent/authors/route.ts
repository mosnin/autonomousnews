import { NextRequest, NextResponse } from "next/server";
import { adminApiAuthorized } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Upsert an author profile (portrait, joined date, social links). Idempotent.
export async function POST(req: NextRequest) {
  if (!adminApiAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "supabase not configured" }, { status: 500 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.slug) {
    return NextResponse.json({ error: "missing slug" }, { status: 400 });
  }
  const row = {
    slug: String(body.slug),
    portrait_url: body.portrait_url ?? null,
    joined_at: body.joined_at ?? null,
    link_x: body.link_x ?? null,
    link_linkedin: body.link_linkedin ?? null,
    link_mastodon: body.link_mastodon ?? null,
    link_web: body.link_web ?? null,
  };
  const { error } = await supabase
    .from("author_profiles")
    .upsert(row, { onConflict: "slug" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
