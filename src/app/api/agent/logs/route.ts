import { NextRequest, NextResponse } from "next/server";
import { adminApiAuthorized } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type IncomingLog = {
  run_id?: string;
  level?: "debug" | "info" | "warn" | "error";
  message: string;
  metadata?: Record<string, unknown>;
};

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

  const entries: IncomingLog[] = Array.isArray(body) ? body : [body];
  const rows = entries
    .filter((e) => typeof e.message === "string")
    .map((e) => ({
      run_id: e.run_id ?? null,
      level: e.level ?? "info",
      message: e.message,
      metadata: e.metadata ?? {},
    }));

  if (rows.length === 0) {
    return NextResponse.json({ inserted: 0 });
  }

  const { error } = await supabase.from("agent_logs").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inserted: rows.length });
}
