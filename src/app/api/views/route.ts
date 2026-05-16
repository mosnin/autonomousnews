import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Beacon endpoint. Public — anyone can ping it. Soft-protected by:
// - service-role write only (no client-side row writes)
// - bot UA filter (cheap, defense-in-depth)
// - the function itself is a SECURITY DEFINER increment, so it's cheap
// - no PII collected
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 200 });

  const ua = (req.headers.get("user-agent") ?? "").toLowerCase();
  if (!ua || /bot|crawler|spider|preview|fetch|monitor|curl|wget/.test(ua)) {
    // Don't inflate counts from bots.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const body = await req.json().catch(() => null);
  const id = body?.article_id;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "missing article_id" }, { status: 400 });
  }

  await supabase.rpc("record_article_view", { p_article_id: id });
  return NextResponse.json({ ok: true });
}
