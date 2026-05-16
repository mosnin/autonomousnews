import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const alt = SITE.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function HomeOg() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#ffffff",
          color: "#121212",
          fontFamily: "Georgia, serif",
          display: "flex",
          flexDirection: "column",
          padding: "72px 80px",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            fontSize: 28,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "#5a5a5a",
          }}
        >
          Techno Times
        </div>
        <div
          style={{
            fontSize: 110,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          {SITE.tagline}
        </div>
        <div
          style={{
            fontSize: 26,
            color: "#5a5a5a",
            borderTop: "2px solid #121212",
            paddingTop: 18,
          }}
        >
          {SITE.description}
        </div>
      </div>
    ),
    { ...size }
  );
}
