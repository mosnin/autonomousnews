import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import MostReadSidebar from "@/components/MostReadSidebar";
import { ARTICLE_BYLINE } from "@/lib/authors";
import type { ArticleSummary } from "@/lib/articles";

const fixture: ArticleSummary = {
  id: "a1",
  slug: "test-story",
  title: "A test story",
  dek: null,
  excerpt: null,
  cover_image_url: null,
  cover_image_alt: null,
  category_slug: "technology",
  subcategory_slug: "ai-and-ml",
  // Legacy DB rows may still carry a fictional persona name — the
  // sidebar must never surface it.
  author_name: "Mira Chen",
  author_slug: "mira-chen",
  is_breaking: false,
  is_featured: false,
  is_live: false,
  published_at: "2026-01-01T00:00:00Z",
  read_minutes: 4,
};

describe("MostReadSidebar byline", () => {
  it("renders the org byline, never the per-row author_name", () => {
    const html = renderToStaticMarkup(<MostReadSidebar articles={[fixture]} />);
    expect(html).toContain(ARTICLE_BYLINE);
    expect(html).not.toContain("Mira Chen");
  });
});
