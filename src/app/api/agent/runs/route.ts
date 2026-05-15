import { NextRequest, NextResponse } from "next/server";
import { adminApiAuthorized } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Create or update an agent run from the worker.
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

  const payload = {
    id: body.id,
    trigger: body.trigger ?? "cron",
    agent: body.agent ?? "news-scout",
    status: body.status ?? "running",
    started_at: body.started_at ?? new Date().toISOString(),
    finished_at: body.finished_at ?? null,
    duration_ms: body.duration_ms ?? null,
    topics_considered: body.topics_considered ?? 0,
    articles_created: body.articles_created ?? 0,
    cost_usd: body.cost_usd ?? null,
    model: body.model ?? null,
    metadata: body.metadata ?? {},
    error: body.error ?? null,
  };

  const { data, error } = await supabase
    .from("agent_runs")
    .upsert(payload, { onConflict: "id" })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: (data as { id: string }).id });
}
