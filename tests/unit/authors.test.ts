import { describe, it, expect } from "vitest";
import { EDITOR, ARTICLE_BYLINE } from "@/lib/authors";

describe("editor masthead", () => {
  it("EDITOR exposes the single-editor shape", () => {
    expect(typeof EDITOR.name).toBe("string");
    expect(typeof EDITOR.title).toBe("string");
    expect(typeof EDITOR.bio).toBe("string");
    expect(EDITOR.name.length).toBeGreaterThan(0);
    expect(EDITOR.title.length).toBeGreaterThan(0);
    expect(EDITOR.bio.length).toBeGreaterThan(0);
  });

  it("social links are string-or-null (never undefined)", () => {
    for (const link of [EDITOR.link_x, EDITOR.link_linkedin, EDITOR.link_web]) {
      expect(link === null || typeof link === "string").toBe(true);
    }
  });

  it("renders a neutral placeholder name when no env var is set", () => {
    // No NEXT_PUBLIC_EDITOR_NAME in the test environment — the default
    // must be a consented placeholder, never a real name or a TODO.
    expect(EDITOR.name).toBe("Editor on Duty");
    expect(EDITOR.name).not.toMatch(/todo/i);
  });

  it("ARTICLE_BYLINE credits the agents and the editor on duty", () => {
    expect(ARTICLE_BYLINE).toBe(
      `Reported by Techno Times Agents · Edited by ${EDITOR.name}`
    );
  });
});
