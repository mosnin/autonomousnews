import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";
import { loadPlayfairFonts } from "@/lib/ogFont";

export const runtime = "nodejs";
export const alt = `${SITE.name} — Autonomous Newsroom`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#fffefb";
const INK = "#121212";
const RULE = "#121212";
const ACCENT = "#0f5dd2"; // technology blue, used as the default brand accent
const MUTED = "#5a5a5a";

export default async function HomeOg() {
  const playfairFonts = await loadPlayfairFonts();
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
        {/* Top section-accent rule */}
        <div
          style={{
            display: "flex",
            width: "100%",
            height: 8,
            background: ACCENT,
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
              color: ACCENT,
              fontFamily: "Helvetica, Arial, sans-serif",
              fontWeight: 700,
            }}
          >
            Techno Times
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
                fontSize: 124,
                fontWeight: 800,
                lineHeight: 0.95,
                letterSpacing: "-0.035em",
              }}
            >
              {SITE.name}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 34,
                color: INK,
                fontStyle: "italic",
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              Autonomous Newsroom · Tech, Money, Power
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
              letterSpacing: "0.18em",
            }}
          >
            <div style={{ display: "flex" }}>{SITE.tagline}</div>
            <div style={{ display: "flex" }}>technotimes.com</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: playfairFonts,
    }
  );
}
