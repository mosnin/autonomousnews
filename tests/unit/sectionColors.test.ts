import { describe, it, expect } from "vitest";
import { SECTION_COLORS, sectionColor } from "@/lib/sectionColors";
import { CATEGORIES } from "@/lib/taxonomy";

describe("sectionColors", () => {
  it("every taxonomy pillar has a color", () => {
    for (const c of CATEGORIES) {
      expect(SECTION_COLORS[c.slug], `missing color for ${c.slug}`).toBeDefined();
    }
  });

  it("each color is a 6-digit hex", () => {
    const hex = /^#[0-9a-f]{6}$/i;
    for (const [slug, c] of Object.entries(SECTION_COLORS)) {
      expect(c.fg).toMatch(hex);
      expect(c.bg).toMatch(hex);
      expect(c.fgDark).toMatch(hex);
      expect(c.bgDark).toMatch(hex);
      void slug;
    }
  });

  it("sectionColor falls back gracefully for unknown slugs", () => {
    const c = sectionColor("not-a-thing");
    expect(c.fg).toBeTruthy();
    expect(c.bg).toBeTruthy();
  });

  it("sectionColor returns the same instance for the same slug", () => {
    expect(sectionColor("technology")).toBe(SECTION_COLORS.technology);
  });
});
