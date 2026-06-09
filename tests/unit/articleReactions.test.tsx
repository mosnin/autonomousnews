import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ArticleReactions from "@/components/ArticleReactions";
import ArticleToolbar from "@/components/ArticleToolbar";

describe("article actions split", () => {
  it("reactions render the end-of-story prompt and both buttons", () => {
    const html = renderToStaticMarkup(
      <ArticleReactions articleId="a1" initialUp={3} initialDown={1} />
    );
    expect(html).toContain("Was this story useful?");
    expect(html).toContain("Mark this article useful");
    expect(html).toContain("Mark this article not useful");
  });

  it("toolbar carries only Save and Share — no Listen, no reactions", () => {
    const html = renderToStaticMarkup(
      <ArticleToolbar articleId="a1" title="t" url="https://x/t" />
    );
    expect(html).toContain("Save");
    expect(html).toContain("Share");
    expect(html).not.toContain("Listen");
    expect(html).not.toContain("Mark this article useful");
  });
});
