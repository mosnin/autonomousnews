import { NextRequest, NextResponse } from "next/server";
import { adminApiAuthorized } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Worker reports the cost of one or more runs by calling this.
// Implementation atomically increments today's row in cost_ledger via the
// add_run_cost SECURITY DEFINER function defined in migration 0002.
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

  const args = {
    p_openai_cost: Number(body.openai_cost_usd ?? 0),
    p_image_cost: Number(body.image_cost_usd ?? 0),
    p_articles: Number(body.articles ?? 0),
    p_runs: Number(body.runs ?? 1),
  };

  const { error } = await supabase.rpc("add_run_cost", args);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
