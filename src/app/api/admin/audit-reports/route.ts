import { NextRequest, NextResponse } from "next/server";
import { adminApiAuthorized } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type AuditRecommendation = "keep" | "correct" | "unpublish";

// Ingest one audit report from the Modal `daily_auditor` job. One row per
// audited article per audit run. Idempotent on (article_id, audit_run_id)
// so a retried Modal invocation cannot double-write.
export async function POST(req: NextRequest) {
  if (!adminApiAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "supabase not configured" }, { status: 500 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const article_id = typeof body.article_id === "string" ? body.article_id : null;
  if (!article_id) {
    return NextResponse.json({ error: "missing article_id" }, { status: 400 });
  }

  const recommendation = body.recommendation;
  if (
    recommendation !== "keep" &&
    recommendation !== "correct" &&
    recommendation !== "unpublish"
  ) {
    return NextResponse.json(
      { error: "invalid recommendation" },
      { status: 400 }
    );
  }

  const audit_run_id =
    typeof body.audit_run_id === "string" ? body.audit_run_id : null;

  const payload = {
    article_id,
    audited_at:
      typeof body.audited_at === "string"
        ? body.audited_at
        : new Date().toISOString(),
    audit_run_id,
    claims_total: Number(body.claims_total ?? 0),
    claims_unsupported: Number(body.claims_unsupported ?? 0),
    drift_from_source: Boolean(body.drift_from_source),
    broken_source_count: Number(body.broken_source_count ?? 0),
    recommendation: recommendation as AuditRecommendation,
    notes: typeof body.notes === "string" ? body.notes : null,
    model_used: typeof body.model_used === "string" ? body.model_used : "unknown",
    prompt_tokens:
      typeof body.prompt_tokens === "number" ? body.prompt_tokens : null,
    completion_tokens:
      typeof body.completion_tokens === "number"
        ? body.completion_tokens
        : null,
    cost_usd: typeof body.cost_usd === "number" ? body.cost_usd : null,
  };

  // Idempotency: if both article_id and audit_run_id are supplied and we
  // already have a row for that pair, update it in place instead of
  // inserting a duplicate. We do this with an explicit lookup + update
  // because the migration intentionally has no unique constraint (a single
  // article can legitimately have many audits over its lifetime).
  if (audit_run_id) {
    const { data: existing } = await supabase
      .from("audit_reports")
      .select("id")
      .eq("article_id", article_id)
      .eq("audit_run_id", audit_run_id)
      .maybeSingle();
    if (existing && (existing as { id: string }).id) {
      const { error } = await supabase
        .from("audit_reports")
        .update(payload)
        .eq("id", (existing as { id: string }).id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ id: (existing as { id: string }).id, updated: true });
    }
  }

  const { data, error } = await supabase
    .from("audit_reports")
    .insert(payload)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: (data as { id: string } | null)?.id ?? null });
}
