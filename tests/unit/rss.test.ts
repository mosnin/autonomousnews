import { describe, it, expect, beforeEach, vi } from "vitest";
import type { ArticleSummary } from "@/lib/articles";

function fakeArticle(over: Partial<ArticleSummary> = {}): ArticleSummary {
  return {
    id: "a1",
    slug: "openai-launches-thing",
    title: "OpenAI Launches <Thing>",
    dek: "A new dek with \"quotes\" & ampersand",
    excerpt: "Excerpt text",
    cover_image_url: null,
    cover_image_alt: null,
    category_slug: "technology",
    subcategory_slug: "artificial-intelligence",
    author_name: "Mira Chen",
    author_slug: "mira-chen",
    is_breaking: false,
    is_featured: false,
    is_live: false,
    published_at: "2026-05-16T12:00:00.000Z",
    read_minutes: 6,
    ...over,
  };
}

describe("rss.renderRssFeed", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
    vi.resetModules();
  });

  it("emits valid RSS 2.0 wrapper + atom self link", async () => {
    const { renderRssFeed } = await import("@/lib/rss");
    const xml = renderRssFeed({
      title: "Test",
      description: "desc",
      selfPath: "/feed.xml",
      articles: [fakeArticle()],
    });
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('<atom:link href="https://example.com/feed.xml" rel="self"');
    expect(xml).toContain("</channel>");
    expect(xml).toContain("</rss>");
  });

  it("escapes title and dek but keeps body in CDATA", async () => {
    const { renderRssFeed } = await import("@/lib/rss");
    const xml = renderRssFeed({
      title: "Tt",
      description: "d",
      selfPath: "/feed.xml",
      articles: [
        fakeArticle({
          title: "<script>alert(1)</script>",
          excerpt: "Has ]]> in body",
        }),
      ],
    });
    expect(xml).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    // CDATA must not leak its closing token
    expect(xml).not.toMatch(/<!\[CDATA\[[^]]*]]>[^<]/);
  });

  it("includes <dc:creator> and <link> per item", async () => {
    const { renderRssFeed } = await import("@/lib/rss");
    const xml = renderRssFeed({
      title: "Tt",
      description: "d",
      selfPath: "/feed.xml",
      articles: [fakeArticle()],
    });
    expect(xml).toContain("<dc:creator>Mira Chen</dc:creator>");
    expect(xml).toContain(
      "<link>https://example.com/technology/openai-launches-thing</link>"
    );
  });

  it("emits <enclosure> + <media:content> when cover_image_url is set", async () => {
    const { renderRssFeed } = await import("@/lib/rss");
    const xml = renderRssFeed({
      title: "Tt",
      description: "d",
      selfPath: "/feed.xml",
      articles: [
        fakeArticle({
          cover_image_url: "https://cdn.example.com/cover.png",
          cover_image_alt: "Hero shot",
        }),
      ],
    });
    expect(xml).toContain('xmlns:media="http://search.yahoo.com/mrss/"');
    expect(xml).toContain(
      '<enclosure url="https://cdn.example.com/cover.png" length="0" type="image/png" />'
    );
    expect(xml).toContain(
      '<media:content url="https://cdn.example.com/cover.png" medium="image" type="image/png" />'
    );
    expect(xml).toContain(
      '<media:description type="plain">Hero shot</media:description>'
    );
  });

  it("omits enclosure when cover_image_url is null", async () => {
    const { renderRssFeed } = await import("@/lib/rss");
    const xml = renderRssFeed({
      title: "Tt",
      description: "d",
      selfPath: "/feed.xml",
      articles: [fakeArticle({ cover_image_url: null })],
    });
    expect(xml).not.toContain("<enclosure");
    expect(xml).not.toContain("<media:content");
  });

  it("emits an empty channel when no articles", async () => {
    const { renderRssFeed } = await import("@/lib/rss");
    const xml = renderRssFeed({
      title: "Tt",
      description: "d",
      selfPath: "/feed.xml",
      articles: [],
    });
    expect(xml).toContain("</channel>");
    expect(xml).not.toMatch(/<item>/);
  });
});
