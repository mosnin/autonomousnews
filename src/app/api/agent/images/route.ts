import { NextRequest, NextResponse } from "next/server";
import { adminApiAuthorized } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = "article-images";
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function extFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}

function safeSlug(s: string): string {
  return (s || "image")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Download an image from `source_url` and stash it in Supabase Storage so it
// survives the source URL expiring. Returns the public CDN URL.
//
// Body: { source_url: string, slug?: string, kind?: 'cover' | 'illustration' }
export async function POST(req: NextRequest) {
  if (!adminApiAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "supabase not configured" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body?.source_url) {
    return NextResponse.json({ error: "missing source_url" }, { status: 400 });
  }

  // Download the source.
  let upstream: Response;
  try {
    upstream = await fetch(body.source_url, {
      redirect: "follow",
      // Some publishers refuse direct hot-link clients; pretend to be a browser.
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TechnoTimesBot/1.0)" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "fetch failed", detail: String(e) },
      { status: 502 }
    );
  }
  if (!upstream.ok) {
    return NextResponse.json(
      { error: `source returned ${upstream.status}` },
      { status: 502 }
    );
  }

  const mime = (upstream.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!ALLOWED.has(mime)) {
    return NextResponse.json(
      { error: `unsupported mime: ${mime}` },
      { status: 415 }
    );
  }

  const arrayBuf = await upstream.arrayBuffer();
  if (arrayBuf.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "image too large" }, { status: 413 });
  }

  const slug = safeSlug(body.slug ?? "image");
  const ext = extFromMime(mime);
  // Date-partitioned so the bucket stays browsable.
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const rand = crypto.randomUUID().slice(0, 8);
  const path = `${yyyy}/${mm}/${dd}/${slug}-${rand}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuf, {
      contentType: mime,
      cacheControl: "31536000",
      upsert: false,
    });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({
    url: pub.publicUrl,
    path,
    bytes: arrayBuf.byteLength,
    mime,
  });
}
