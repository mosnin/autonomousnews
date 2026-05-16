import { describe, it, expect } from "vitest";
import { AUTHORS, findAuthor, selectAuthorForTopic } from "@/lib/authors";
import { CATEGORIES } from "@/lib/taxonomy";

describe("authors", () => {
  it("roster has 15 unique slugs", () => {
    expect(AUTHORS.length).toBe(15);
    const slugs = AUTHORS.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("each author has a populated joinedAt + initials + beat", () => {
    for (const a of AUTHORS) {
      expect(a.joinedAt).toMatch(/^\d{4}-\d{2}$/);
      expect(a.initials).toMatch(/^[A-Z]{2,3}$/);
      expect(a.beat.length).toBeGreaterThan(0);
    }
  });

  it("every author's beat references a real category", () => {
    const known = new Set(CATEGORIES.map((c) => c.slug));
    for (const a of AUTHORS) {
      for (const b of a.beat) expect(known).toContain(b);
    }
  });

  it("every author's subBeat references a real subcategory of that author's beat", () => {
    const subsByCat = new Map(
      CATEGORIES.map((c) => [c.slug, new Set(c.subcategories.map((s) => s.slug))])
    );
    for (const a of AUTHORS) {
      for (const sb of a.subBeat ?? []) {
        const matched = a.beat.some((b) => subsByCat.get(b)?.has(sb));
        expect(matched, `${a.slug} has subBeat ${sb} not in beats`).toBe(true);
      }
    }
  });

  it("findAuthor round-trips", () => {
    expect(findAuthor("mira-chen")?.name).toBe("Mira Chen");
    expect(findAuthor("not-a-person")).toBeUndefined();
  });

  describe("selectAuthorForTopic", () => {
    it("prefers a sub-beat match over a category-only match", () => {
      const a = selectAuthorForTopic("technology", "artificial-intelligence");
      expect(a.slug).toBe("mira-chen");
    });

    it("falls back to category match when no sub-beat hits", () => {
      const a = selectAuthorForTopic("sports", null);
      expect(a.slug).toBe("theo-kane");
    });

    it("falls back to opinion fallback if nothing matches", () => {
      const a = selectAuthorForTopic("totally-unknown", "also-unknown");
      // Elena Kovac is the documented fallback (last entry in the array).
      expect(a.slug).toBe("elena-kovac");
    });
  });
});
