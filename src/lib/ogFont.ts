// Shared loader for the Playfair Display fonts used by the programmatic
// OpenGraph image routes. `next/og` does not honor system fonts — when no
// font is provided it falls back to a bundled sans, which looks off-brand
// for a NYT-style publication. We ship three OFL-licensed Playfair Display
// static cuts in `src/fonts/` and load the raw bytes once per process so
// the headline, byline, and tagline can all render in a real serif.
//
// Why three static cuts instead of the variable font? The Playfair variable
// TTF (~294 KB, all weights+italics in one file) crashes `@vercel/og`'s
// satori-based `parseFvarAxis` with
//   TypeError: Cannot read properties of undefined (reading '256')
// That bug is upstream in next/og and unresolved as of this commit. Until
// it's fixed, three static cuts (Bold for headlines, Regular for byline/dek,
// BoldItalic for emphasis + tagline) give us the typographic registers we
// need without triggering the variable-font code path.
//
// The files are co-located under `src/` (not `public/`) so they get bundled
// into the route artifact and are not served as static assets.
import { readFile } from "node:fs/promises";
import path from "node:path";

export type PlayfairFont = {
  name: "Playfair Display";
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal" | "italic";
};

type Cut = {
  file: string;
  weight: 400 | 700;
  style: "normal" | "italic";
};

const CUTS: Cut[] = [
  { file: "PlayfairDisplay-Regular.ttf", weight: 400, style: "normal" },
  { file: "PlayfairDisplay-Bold.ttf", weight: 700, style: "normal" },
  { file: "PlayfairDisplay-BoldItalic.ttf", weight: 700, style: "italic" },
];

let cached: PlayfairFont[] | null = null;

async function readAsArrayBuffer(relPath: string): Promise<ArrayBuffer> {
  // process.cwd() is the project root in both `next dev` and `next build`
  // serverless runtimes; the fonts are committed at src/fonts/.
  const file = path.join(process.cwd(), "src/fonts", relPath);
  const buf = await readFile(file);
  // Copy into a fresh ArrayBuffer so we don't hand `next/og` a slice of a
  // shared Node Buffer pool.
  return buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength,
  ) as ArrayBuffer;
}

/**
 * Load all three Playfair Display cuts (Regular, Bold, Bold Italic) ready
 * to pass to `ImageResponse`'s `fonts:` option. Bytes are memoized after
 * the first call so subsequent OG renders skip the disk I/O.
 */
export async function loadPlayfairFonts(): Promise<PlayfairFont[]> {
  if (cached) return cached;
  const fonts = await Promise.all(
    CUTS.map(async (cut) => ({
      name: "Playfair Display" as const,
      data: await readAsArrayBuffer(cut.file),
      weight: cut.weight,
      style: cut.style,
    })),
  );
  cached = fonts;
  return fonts;
}

/**
 * Backwards-compatible loader returning just the Bold (700) cut as a raw
 * ArrayBuffer. Kept so callers that only need the headline weight don't
 * have to filter through the full list. New call sites should prefer
 * `loadPlayfairFonts()`.
 */
export async function loadPlayfairDisplay(): Promise<ArrayBuffer> {
  const fonts = await loadPlayfairFonts();
  const bold = fonts.find((f) => f.weight === 700 && f.style === "normal");
  if (!bold) {
    throw new Error("Playfair Display Bold cut missing from font bundle");
  }
  return bold.data;
}
