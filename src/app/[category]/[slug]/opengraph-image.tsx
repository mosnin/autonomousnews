import { ImageResponse } from "next/og";
import { getArticleBySlug } from "@/lib/articles";
import { findCategory, findSubcategory } from "@/lib/taxonomy";
import { sectionColor } from "@/lib/sectionColors";
import { SITE } from "@/lib/site";
import { ORG_BYLINE } from "@/lib/authors";
import { loadPlayfairFonts } from "@/lib/ogFont";

export const runtime = "nodejs";
export const alt = "Article preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#fffefb";
const INK = "#121212";
const MUTED = "#5a5a5a";
const RULE = "#121212";

// Truncate a string at a soft boundary. ImageResponse does not reliably
// honor WebkitLineClamp, so we slice ourselves and append an ellipsis.
function clip(input: string, max: number): string {
  if (input.length <= max) return input;
  return input.slice(0, max - 1).trimEnd() + "…";
}

export default async function ArticleOg({
  params,
}: {
  params: { category: string; slug: string };
}) {
  const article = await getArticleBySlug(params.slug).catch(() => null);
  const fonts = await loadPlayfairFonts();

  // Fallback layout if Supabase isn't configured or the slug is unknown — we
  // never want the OG route to 500, since social platforms cache failures.
  if (!article) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: PAPER,
            color: INK,
            display: "flex",
            flexDirection: "column",
            fontFamily: "Playfair Display",
          }}
        >
          <div
            style={{
              display: "flex",
              width: "100%",
              height: 8,
              background: "#0f5dd2",
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              padding: "72px 80px",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 22,
                textTransform: "uppercase",
                letterSpacing: "0.22em",
                color: "#0f5dd2",
                fontFamily: "Helvetica, Arial, sans-serif",
                fontWeight: 700,
              }}
            >
              Techno Times
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 96,
                fontWeight: 800,
                lineHeight: 1.0,
                letterSpacing: "-0.03em",
              }}
            >
              {SITE.tagline}
            </div>
            <div
              style={{
                display: "flex",
                borderTop: `2px solid ${RULE}`,
                paddingTop: 18,
                fontSize: 22,
                color: MUTED,
                fontFamily: "Helvetica, Arial, sans-serif",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
              }}
            >
              technotimes.com
            </div>
          </div>
        </div>
      ),
      { ...size, fonts }
    );
  }

  // --- Article data ----------------------------------------------------
  const categorySlug = article.category_slug || params.category;
  const subSlug = article.subcategory_slug ?? null;
  const accent = sectionColor(categorySlug).fg;

  const category = findCategory(categorySlug);
  const subInfo =
    subSlug && category
      ? findSubcategory(categorySlug, subSlug)?.subcategory
      : undefined;

  const categoryName = category?.name?.toUpperCase() ?? "NEWS";
  const subName = subInfo?.name?.toUpperCase();
  const kicker = subName ? `${categoryName} · ${subName}` : categoryName;

  const titleRaw = article.title ?? "Untitled";
  const title = clip(titleRaw, 120);

  // Scale headline so longer titles still fit ~3 lines at 1200×630.
  const titleFontSize =
    title.length > 90 ? 64 : title.length > 60 ? 76 : title.length > 36 ? 88 : 104;

  const author = ORG_BYLINE;
  const readMinutes =
    typeof article.read_minutes === "number" && article.read_minutes > 0
      ? `${article.read_minutes} min read`
      : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: PAPER,
          color: INK,
          display: "flex",
          flexDirection: "column",
          fontFamily: "Playfair Display",
        }}
      >
        {/* Section accent rule — full width, 8px tall, near the top. */}
        <div
          style={{
            display: "flex",
            width: "100%",
            height: 8,
            background: accent,
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "56px 72px 48px 72px",
            justifyContent: "space-between",
          }}
        >
          {/* Kicker */}
          <div
            style={{
              display: "flex",
              fontSize: 22,
              textTransform: "uppercase",
              letterSpacing: "0.22em",
              color: accent,
              fontFamily: "Helvetica, Arial, sans-serif",
              fontWeight: 700,
            }}
          >
            {kicker}
          </div>

          {/* Headline */}
          <div
            style={{
              display: "flex",
              fontSize: titleFontSize,
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: "-0.02em",
              color: INK,
            }}
          >
            {title}
          </div>

          {/* Footer: byline + wordmark */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              borderTop: `2px solid ${RULE}`,
              paddingTop: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                // Byline sits in Playfair Regular to harmonise with the
                // serif headline above it — Helvetica looked detached.
                fontFamily: "Playfair Display",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 26,
                  color: INK,
                  fontWeight: 400,
                  letterSpacing: "0.01em",
                }}
              >
                {`By ${author}`}
              </div>
              {readMinutes ? (
                <div
                  style={{
                    display: "flex",
                    fontSize: 22,
                    color: MUTED,
                    fontWeight: 400,
                    letterSpacing: "0.02em",
                  }}
                >
                  {readMinutes}
                </div>
              ) : null}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 24,
                textTransform: "uppercase",
                letterSpacing: "0.28em",
                color: accent,
                fontWeight: 800,
              }}
            >
              Techno Times
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
