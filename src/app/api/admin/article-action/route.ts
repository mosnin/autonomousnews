import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const form = await req.formData();
  const id = String(form.get("id") ?? "");
  const action = String(form.get("action") ?? "");
  if (!id || !action) {
    return NextResponse.json({ error: "missing id or action" }, { status: 400 });
  }

  const { data: current } = await supabase
    .from("articles")
    .select("id, is_featured, is_breaking, published_at")
    .eq("id", id)
    .maybeSingle();
  if (!current) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  type ArticleUpdate = {
    status?: "draft" | "scheduled" | "published" | "archived";
    published_at?: string | null;
    is_featured?: boolean;
    is_breaking?: boolean;
  };
  const updates: ArticleUpdate = {};
  switch (action) {
    case "publish":
      updates.status = "published";
      updates.published_at = current.published_at ?? new Date().toISOString();
      break;
    case "unpublish":
      updates.status = "draft";
      break;
    case "archive":
      updates.status = "archived";
      break;
    case "toggle-featured":
      updates.is_featured = !current.is_featured;
      break;
    case "toggle-breaking":
      updates.is_breaking = !current.is_breaking;
      break;
    default:
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }

  const { error } = await supabase.from("articles").update(updates).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.redirect(new URL(`/admin/articles/${id}`, req.url));
}
