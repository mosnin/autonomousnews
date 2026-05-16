import { NextRequest, NextResponse } from "next/server";
import { adminApiAuthorized } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { DAILY_BUDGET_USD } from "@/lib/site";

// Worker calls this at the start of a run to decide whether to proceed.
export async function GET(req: NextRequest) {
  if (!adminApiAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  const cap = DAILY_BUDGET_USD;
  if (!supabase) {
    return NextResponse.json({
      cap_usd: cap,
      spent_usd: 0,
      remaining_usd: cap,
      over_budget: false,
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("cost_ledger")
    .select("total_cost_usd")
    .eq("day", today)
    .maybeSingle();

  const spent = Number(
    (data as { total_cost_usd?: number } | null)?.total_cost_usd ?? 0
  );
  const remaining = Math.max(0, cap - spent);
  return NextResponse.json({
    cap_usd: cap,
    spent_usd: spent,
    remaining_usd: remaining,
    over_budget: spent >= cap,
  });
}
