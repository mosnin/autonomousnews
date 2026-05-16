import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { findAuthor } from "@/lib/authors";

const STYLE =
  "studio editorial portrait, head and shoulders, soft natural lighting, " +
  "neutral gray background, sharp focus, hyper-realistic, modern, classy, " +
  "muted color palette, magazine-quality, no text, no logos, no watermark, " +
  "professional newsroom attire, looking directly at camera with calm " +
  "confident expression";

// Regenerate a single author's portrait via DALL·E 3 and re-host it in
// Supabase Storage. Cookie-auth admin only. Used by the button on
// /admin/authors when you want to re-roll one face without running the
// full bulk script.
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "supabase not configured" },
      { status: 500 }
    );
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not set on the Next.js app" },
      { status: 500 }
    );
  }

  const form = await req.formData();
  const slug = String(form.get("slug") ?? "");
  const author = findAuthor(slug);
  if (!author) {
    return NextResponse.json({ error: "unknown author" }, { status: 404 });
  }

  // 1. DALL·E generation
  const prompt =
    `A portrait of ${author.name}, ${author.title}. ${STYLE}. ` +
    `The subject is a real-looking person, age 30-50, ethnicity inferred ` +
    `from the name; treat as a fictional character. Not a celebrity.`;

  const imgRes = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      size: "1024x1024",
      quality: "standard",
      n: 1,
    }),
  });
  if (!imgRes.ok) {
    const detail = await imgRes.text().catch(() => "");
    return NextResponse.json(
      { error: `DALL·E failed: ${imgRes.status} ${detail.slice(0, 200)}` },
      { status: 502 }
    );
  }
  const imgJson = await imgRes.json();
  const dalleUrl = imgJson?.data?.[0]?.url as string | undefined;
  if (!dalleUrl) {
    return NextResponse.json({ error: "DALL·E returned no URL" }, { status: 502 });
  }

  // 2. Persist into Supabase Storage by piggybacking on /api/agent/images.
  const persistRes = await fetch(
    new URL("/api/agent/images", req.url).toString(),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.ADMIN_API_KEY ?? ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ source_url: dalleUrl, slug: `author-${slug}` }),
    }
  );
  if (!persistRes.ok) {
    const detail = await persistRes.text().catch(() => "");
    return NextResponse.json(
      { error: `persist failed: ${persistRes.status} ${detail.slice(0, 200)}` },
      { status: 502 }
    );
  }
  const { url: persistedUrl } = (await persistRes.json()) as { url: string };

  // 3. Upsert into author_profiles.
  const { error } = await supabase
    .from("author_profiles")
    .upsert(
      { slug, portrait_url: persistedUrl },
      { onConflict: "slug" }
    );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.redirect(new URL("/admin/authors", req.url));
}
