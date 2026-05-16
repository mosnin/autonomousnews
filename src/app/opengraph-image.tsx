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
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 36, height: 8, background: "#0f5dd2" }} />
          <div
            style={{
              fontSize: 22,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "#5a5a5a",
            }}
          >
            Techno Times
          </div>
        </div>
        <div
          style={{
            fontSize: 124,
            fontWeight: 800,
            lineHeight: 0.95,
            letterSpacing: "-0.035em",
          }}
        >
          {SITE.tagline}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 24,
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
