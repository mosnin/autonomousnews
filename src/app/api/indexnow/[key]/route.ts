import { NextResponse } from "next/server";
import { indexNowKey } from "@/lib/indexnow";

// IndexNow verification endpoint. Set `INDEXNOW_KEY` and point
// `keyLocation` at /api/indexnow/<key> in the IndexNow payload.
//
// (IndexNow's spec wants the key file at /<key>.txt; if you need that exact
// path, either drop a static file in `public/<key>.txt` or add a Vercel
// rewrite from /<key>.txt -> /api/indexnow/<key>.)
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
