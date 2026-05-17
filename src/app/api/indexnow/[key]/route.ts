import { NextResponse } from "next/server";
import { indexNowKey } from "@/lib/indexnow";

// IndexNow verification endpoint. Set `INDEXNOW_KEY`; the client points
// `keyLocation` at /<key>.txt per the IndexNow spec, and a Next.js rewrite
// in next.config.mjs maps /<key>.txt -> /api/indexnow/<key> so this handler
// serves the verification body.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key: requested } = await params;
  const key = indexNowKey();
  if (!key || requested !== key) {
    return new NextResponse("Not found", { status: 404 });
  }
  return new NextResponse(key, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
