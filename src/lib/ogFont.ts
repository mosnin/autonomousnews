// Shared loader for the Playfair Display headline font used by the
// programmatic OpenGraph image routes. `next/og` does not honor system
// fonts — when no font is provided it falls back to a bundled sans, which
// looks off-brand for a NYT-style publication. We ship the OFL-licensed
// Playfair Display variable cut in `src/fonts/` and load the raw bytes
// once per render so the headline renders in a real serif.
//
// The file is co-located under `src/` (not `public/`) so it gets bundled
// into the route artifact and is not served as a static asset.
import { readFile } from "node:fs/promises";
import path from "node:path";

let cached: ArrayBuffer | null = null;

export async function loadPlayfairDisplay(): Promise<ArrayBuffer> {
  if (cached) return cached;
  // process.cwd() is the project root in both `next dev` and `next build`
  // serverless runtimes; the font is committed at src/fonts/.
  const file = path.join(process.cwd(), "src/fonts/PlayfairDisplay-Bold.ttf");
  const buf = await readFile(file);
  // Copy into a fresh ArrayBuffer so we don't hand `next/og` a slice of a
  // shared Node Buffer pool.
  const ab = buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength,
  ) as ArrayBuffer;
  cached = ab;
  return ab;
}
