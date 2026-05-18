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
        "OpenAI is racing ahead in Cybersecurity research.",
        { maxLinks: 3 }
      )
    );
    expect(out).toContain('href="/technology/cybersecurity"');
    expect(out).toContain("Cybersecurity");
  });

  it("excludes hrefs in excludeHrefs (self-links to same category)", () => {
    const out = html(
      renderArticleBody(
        "The Cybersecurity beat is busy this week.",
        {
          excludeHrefs: new Set(["/technology/cybersecurity"]),
          maxLinks: 3,
        }
      )
    );
    expect(out).not.toContain('href="/technology/cybersecurity"');
  });

  it("caps total inserted links at maxLinks", () => {
    const body =
      "Mira Chen covers Cybersecurity and Software at Technology.";
    const out = html(renderArticleBody(body, { maxLinks: 1 }));
    const linkCount = (out.match(/<a\s/g) ?? []).length;
    expect(linkCount).toBe(1);
  });

  it("renders longest-first so 'Cybersecurity' beats 'Technology'", () => {
    const out = html(
      renderArticleBody("Cybersecurity is reshaping Technology.", {
        maxLinks: 3,
      })
    );
    // The "Cybersecurity" subcategory link should be present and
    // the plain word "Technology" can still link separately.
    expect(out).toContain('href="/technology/cybersecurity"');
  });
});

describe("articleBody body-image allow-list", () => {
  it("renders an image whose URL is in the allow-list", () => {
    const allowed = new Set(["https://reuters.example/img.jpg"]);
    const out = html(
      renderArticleBody(
        "Setup paragraph.\n\n![A chart](https://reuters.example/img.jpg)\n\nMore text.",
        { allowedImageUrls: allowed, maxLinks: 0 }
      )
    );
    expect(out).toContain('src="https://reuters.example/img.jpg"');
    expect(out).toContain('alt="A chart"');
  });

  it("drops an image whose URL is NOT in the allow-list, keeping alt text", () => {
    const allowed = new Set(["https://allowed.example/x.jpg"]);
    const out = html(
      renderArticleBody(
        "![Sneaky tracker](https://evil.example/tracker.gif)",
        { allowedImageUrls: allowed, maxLinks: 0 }
      )
    );
    expect(out).not.toContain("evil.example");
    expect(out).not.toContain("<img");
    // Alt text falls through so the paragraph still reads.
    expect(out).toContain("Sneaky tracker");
  });

  it("allows every image when no allow-list is supplied", () => {
    const out = html(
      renderArticleBody(
        "![X](https://anywhere.example/y.jpg)",
        { maxLinks: 0 }
      )
    );
    expect(out).toContain('src="https://anywhere.example/y.jpg"');
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
