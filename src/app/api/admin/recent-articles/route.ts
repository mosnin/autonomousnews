import { NextRequest, NextResponse } from "next/server";
import { adminApiAuthorized } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Feeds the post-hoc auditor (Modal cron `daily_auditor`). Returns articles
// published in a recent time window so the auditor can random-sample some of
// them and re-fact-check against their cited sources.
//
// Service-role / admin-API-key only — never exposed to readers.
export async function GET(req: NextRequest) {
  if (!adminApiAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ articles: [] });
  }

  const url = new URL(req.url);
  const since = (url.searchParams.get("since") || "24h").toLowerCase();
  // Whitelist: today we only support 24h. The shape leaves room to grow
  // (7d, 30d) without re-cutting clients, but we don't accept arbitrary
  // input — never let an unauthenticated query parameter set the lookback.
  let windowMs: number;
  if (since === "24h") {
    windowMs = 24 * 3600 * 1000;
  } else if (since === "7d") {
    windowMs = 7 * 24 * 3600 * 1000;
  } else {
    return NextResponse.json(
      { error: "unsupported since window (use 24h)" },
      { status: 400 }
    );
  }

  const sinceIso = new Date(Date.now() - windowMs).toISOString();

  const { data, error } = await supabase
    .from("articles")
    .select(
      "id, slug, title, category_slug, published_at, sources_used"
    )
    .eq("status", "published")
    .gte("published_at", sinceIso)
    .order("published_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ articles: data ?? [] });
}
