import { ImageResponse } from "next/og";
import { getArticleBySlug } from "@/lib/articles";
import { findCategory } from "@/lib/taxonomy";
import { SITE } from "@/lib/site";

export const alt = "Article preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function ArticleOg({
  params,
}: {
  params: { category: string; slug: string };
}) {
  const article = await getArticleBySlug(params.slug);

  // Fallback for unknown / unindexed articles so previews never break.
  const title = article?.title ?? "Techno Times";
  const dek = article?.dek ?? SITE.tagline;
  const author = article?.author_name ?? SITE.name;
  const cat = findCategory(params.category)?.name ?? "News";

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
          padding: "60px 72px",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "#5a5a5a",
          }}
        >
          <div>{SITE.name}</div>
          <div>{cat}</div>
        </div>
        <div
          style={{
            fontSize: title.length > 80 ? 64 : 80,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.015em",
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            borderTop: "2px solid #121212",
            paddingTop: 16,
          }}
        >
          <div style={{ fontSize: 26, color: "#5a5a5a", lineHeight: 1.3 }}>
            {dek.length > 160 ? dek.slice(0, 157) + "…" : dek}
          </div>
          <div
            style={{
              fontSize: 20,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "#121212",
            }}
          >
            {`By ${author}`}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
