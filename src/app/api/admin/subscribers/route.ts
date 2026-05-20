import { NextRequest, NextResponse } from "next/server";
import { adminApiAuthorized } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Feeds the daily email digest (Modal cron `daily_digest`). Returns the
// email addresses of every confirmed, non-unsubscribed newsletter
// subscriber so the worker can bcc them the brief.
//
// Service-role / admin-API-key only — newsletter_subscribers has no public
// select policy and addresses must never be exposed to readers.
export async function GET(req: NextRequest) {
  if (!adminApiAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ subscribers: [] });
  }

  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .select("email")
    .eq("confirmed", true)
    .eq("unsubscribed", false);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const subscribers = (data ?? []).map((r) => r.email).filter(Boolean);
  return NextResponse.json({ subscribers });
}
