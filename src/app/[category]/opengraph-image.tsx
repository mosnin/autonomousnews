import { ImageResponse } from "next/og";
import { findCategory } from "@/lib/taxonomy";
import { sectionColor } from "@/lib/sectionColors";
import { SITE } from "@/lib/site";
import { loadPlayfairDisplay } from "@/lib/ogFont";

export const runtime = "nodejs";
export const alt = "Section preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#fffefb";
const INK = "#121212";
const MUTED = "#5a5a5a";
const RULE = "#121212";

export default async function CategoryOg({
  params,
}: {
  params: { category: string };
}) {
  const category = findCategory(params.category);
  const accent = sectionColor(params.category).fg;
  const playfair = await loadPlayfairDisplay();

  const name = category?.name ?? "News";
  const description = category?.description ?? SITE.tagline;
  // Description is decorative on the card — keep it tight.
  const blurb =
    description.length > 140
      ? description.slice(0, 137).trimEnd() + "…"
      : description;

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
        {/* Section accent rule */}
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
            padding: "64px 80px 56px 80px",
            justifyContent: "space-between",
          }}
        >
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
            Category
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: name.length > 14 ? 132 : 168,
                fontWeight: 800,
                lineHeight: 0.95,
                letterSpacing: "-0.035em",
                color: INK,
              }}
            >
              {name}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 30,
                color: MUTED,
                fontStyle: "italic",
                lineHeight: 1.25,
                maxWidth: 980,
              }}
            >
              {blurb}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: `2px solid ${RULE}`,
              paddingTop: 18,
              fontSize: 22,
              color: MUTED,
              fontFamily: "Helvetica, Arial, sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.22em",
            }}
          >
            <div
              style={{
                display: "flex",
                color: accent,
                fontWeight: 800,
              }}
            >
              Techno Times
            </div>
            <div style={{ display: "flex" }}>technotimes.com</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Playfair Display",
          data: playfair,
          style: "normal",
          weight: 700,
        },
      ],
    }
  );
}
