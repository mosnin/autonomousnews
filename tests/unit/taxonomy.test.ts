import { describe, it, expect } from "vitest";
import {
  CATEGORIES,
  findCategory,
  findSubcategory,
  CATEGORY_BY_SLUG,
} from "@/lib/taxonomy";

describe("taxonomy", () => {
  it("has 16 top-level pillars", () => {
    expect(CATEGORIES.length).toBe(16);
  });

  it("all pillar slugs are unique and lowercased kebab", () => {
    const slugs = CATEGORIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) {
      expect(s).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("each pillar has ≥4 subpillars and unique sub slugs within it", () => {
    for (const c of CATEGORIES) {
      expect(c.subcategories.length).toBeGreaterThanOrEqual(4);
      const subs = c.subcategories.map((s) => s.slug);
      expect(new Set(subs).size).toBe(subs.length);
      for (const s of c.subcategories) {
        expect(s.slug).toMatch(/^[a-z0-9-]+$/);
        expect(s.name).not.toBe("");
        expect(s.description).not.toBe("");
      }
    }
  });

  it("CATEGORY_BY_SLUG covers everything", () => {
    expect(CATEGORY_BY_SLUG.size).toBe(CATEGORIES.length);
    for (const c of CATEGORIES) {
      expect(CATEGORY_BY_SLUG.get(c.slug)).toBe(c);
    }
  });

  it("findCategory + findSubcategory round-trip", () => {
    const tech = findCategory("technology");
    expect(tech?.name).toBe("Technology");
    const ai = findSubcategory("technology", "artificial-intelligence");
    expect(ai?.subcategory.name).toBe("Artificial Intelligence");
    expect(ai?.category.slug).toBe("technology");
  });

  it("findCategory returns undefined for unknown slug", () => {
    expect(findCategory("not-a-section")).toBeUndefined();
    expect(findSubcategory("technology", "not-a-sub")).toBeUndefined();
    expect(findSubcategory("not-a-section", "anything")).toBeUndefined();
  });
});
