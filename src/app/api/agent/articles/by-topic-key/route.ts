import { NextRequest, NextResponse } from "next/server";
import { adminApiAuthorized } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Living-article lookup: given a topic_key, return the existing article so
// the writer agent can produce an *update* rather than a duplicate. Returns
// 204 No Content when no existing article exists.
export async function GET(req: NextRequest) {
  if (!adminApiAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "supabase not configured" }, { status: 500 });
  }

  const url = new URL(req.url);
  const topicKey = url.searchParams.get("topic_key");
  if (!topicKey) {
    return NextResponse.json({ error: "missing topic_key" }, { status: 400 });
  }

  const { data } = await supabase
    .from("articles")
    .select(
      "id, slug, title, dek, body, excerpt, category_slug, subcategory_slug, tags, author_slug, author_name, source_urls, update_count, published_at, updated_at"
    )
    .eq("topic_key", topicKey)
    .maybeSingle();

  if (!data) return new NextResponse(null, { status: 204 });
  return NextResponse.json(data);
}
