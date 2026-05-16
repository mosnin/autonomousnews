import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import {
  renderArticleBody,
  extractChapters,
} from "@/lib/articleBody";

function html(node: React.ReactNode): string {
  return renderToString(<>{node}</>);
}

describe("articleBody.renderArticleBody", () => {
  it("splits paragraphs on blank lines", () => {
    const out = html(renderArticleBody("first.\n\nsecond.\n\nthird."));
    expect(out).toContain("<p>first.</p>");
    expect(out).toContain("<p>second.</p>");
    expect(out).toContain("<p>third.</p>");
  });

  it("recognizes `## ` H2 with stable slug id", () => {
    const out = html(renderArticleBody("intro\n\n## How It Started\n\nbody"));
    expect(out).toContain('<h2 id="how-it-started">');
    expect(out).toContain("How It Started");
  });

  it("recognizes `>> ` pull quotes", () => {
    const out = html(
      renderArticleBody("setup.\n\n>> A standout line worth pulling.\n\nrest.")
    );
    expect(out).toContain('class="pull-quote"');
    expect(out).toContain("A standout line worth pulling.");
  });

  it("internal-links the first occurrence of a known phrase to its cluster URL", () => {
    const out = html(
      renderArticleBody(
        "OpenAI is racing ahead in Artificial Intelligence research.",
        { maxLinks: 3 }
      )
    );
    expect(out).toContain('href="/technology/artificial-intelligence"');
    expect(out).toContain("Artificial Intelligence");
  });

  it("excludes hrefs in excludeHrefs (self-links to same category)", () => {
    const out = html(
      renderArticleBody(
        "The Artificial Intelligence beat is busy this week.",
        {
          excludeHrefs: new Set(["/technology/artificial-intelligence"]),
          maxLinks: 3,
        }
      )
    );
    expect(out).not.toContain('href="/technology/artificial-intelligence"');
  });

  it("caps total inserted links at maxLinks", () => {
    const body =
      "Mira Chen covers Artificial Intelligence and Software at Technology.";
    const out = html(renderArticleBody(body, { maxLinks: 1 }));
    const linkCount = (out.match(/<a\s/g) ?? []).length;
    expect(linkCount).toBe(1);
  });

  it("renders longest-first so 'Artificial Intelligence' beats 'Technology'", () => {
    const out = html(
      renderArticleBody("Artificial Intelligence is reshaping Technology.", {
        maxLinks: 3,
      })
    );
    // The "Artificial Intelligence" subcategory link should be present and
    // the plain word "Technology" can still link separately.
    expect(out).toContain('href="/technology/artificial-intelligence"');
  });
});

describe("articleBody.extractChapters", () => {
  it("returns h2 chapters in order with slug ids", () => {
    const chapters = extractChapters(
      "intro\n\n## Background\n\nbody.\n\n## What's Next\n\nmore."
    );
    expect(chapters).toEqual([
      { id: "background", text: "Background" },
      { id: "what-s-next", text: "What's Next" },
    ]);
  });

  it("empty for body without H2s", () => {
    expect(extractChapters("just text\n\nmore text")).toEqual([]);
  });
});
