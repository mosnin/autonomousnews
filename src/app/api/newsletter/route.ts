import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Passive newsletter capture. Stores the address; does not send anything.
// When you connect a real provider (Resend, Loops, Substack), backfill from
// newsletter_subscribers.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const source = body?.source ? String(body.source).slice(0, 64) : null;

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: true, stored: false });

  const { error } = await supabase
    .from("newsletter_subscribers")
    .upsert({ email, source, unsubscribed: false }, { onConflict: "email" });

  if (error) {
    return NextResponse.json({ error: "store failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
