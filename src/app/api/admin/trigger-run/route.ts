import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("agent_runs")
    .insert({
      trigger: "manual",
      agent: "news-scout",
      status: "queued",
    })
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // The Modal worker should be polling for queued runs; this just enqueues.
  return NextResponse.redirect(
    new URL(`/admin/runs/${(data as { id: string }).id}`, req.url)
  );
}
