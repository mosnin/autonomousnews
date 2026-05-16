import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Anonymous thumbs up/down. Soft-rate-limited by a localStorage flag on the
// client; nothing prevents replay, but the worst case is inflated counts on
// a single article, which is fine for a feedback signal.
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 200 });

  const body = await req.json().catch(() => null);
  const id = body?.article_id;
  const value = body?.value;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "missing article_id" }, { status: 400 });
  }
  if (value !== "up" && value !== "down") {
    return NextResponse.json({ error: "value must be 'up' or 'down'" }, { status: 400 });
  }

  await supabase.rpc("record_article_reaction", {
    p_article_id: id,
    p_value: value,
  });

  const { data } = await supabase
    .from("article_reactions")
    .select("thumbs_up, thumbs_down")
    .eq("article_id", id)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    thumbs_up: (data as { thumbs_up?: number } | null)?.thumbs_up ?? 0,
    thumbs_down: (data as { thumbs_down?: number } | null)?.thumbs_down ?? 0,
  });
}
