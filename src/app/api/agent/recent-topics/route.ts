import { NextRequest, NextResponse } from "next/server";
import { adminApiAuthorized } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Returns recently-touched topic keys + their titles so the editor agent can
// decide whether a new trending headline is a continuation of an existing
// story (in which case it reuses the topic_key, triggering a living update).
export async function GET(req: NextRequest) {
  if (!adminApiAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ topics: [] });

  const url = new URL(req.url);
  const days = Math.max(1, Math.min(30, Number(url.searchParams.get("days") ?? "7")));
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const { data } = await supabase
    .from("articles")
    .select("topic_key, title, category_slug, subcategory_slug, updated_at")
    .eq("status", "published")
    .not("topic_key", "is", null)
    .gte("updated_at", since)
    .order("updated_at", { ascending: false })
    .limit(200);

  return NextResponse.json({ topics: data ?? [] });
}
