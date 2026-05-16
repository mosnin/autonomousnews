import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#121212",
          color: "#ffffff",
          fontSize: 22,
          fontWeight: 700,
          fontFamily: "Georgia, serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          letterSpacing: "-0.05em",
        }}
      >
        Tt
      </div>
    ),
    { ...size }
  );
}
