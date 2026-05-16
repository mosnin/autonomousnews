import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { limitByIp, rateLimitHeaders } from "@/lib/rateLimit";

// Beacon endpoint. Public — anyone can ping it. Defense-in-depth:
// - service-role-only writes (no client can write directly)
// - bot UA filter to keep counts honest
// - sliding-window IP rate limit (when Upstash configured)
// - no PII collected
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 200 });

  const ua = (req.headers.get("user-agent") ?? "").toLowerCase();
  if (!ua || /bot|crawler|spider|preview|fetch|monitor|curl|wget/.test(ua)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const rl = await limitByIp(req, "views", 60, 60);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate limited" },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  const body = await req.json().catch(() => null);
  const id = body?.article_id;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "missing article_id" }, { status: 400 });
  }

  await supabase.rpc("record_article_view", { p_article_id: id });
  return NextResponse.json({ ok: true }, { headers: rateLimitHeaders(rl) });
}
