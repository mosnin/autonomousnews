import { describe, it, expect } from "vitest";
import { extractLinkTargetSlugs, percentile } from "@/lib/admin/links";

describe("extractLinkTargetSlugs", () => {
  it("returns an empty array for empty / null bodies", () => {
    expect(extractLinkTargetSlugs(null)).toEqual([]);
    expect(extractLinkTargetSlugs(undefined)).toEqual([]);
    expect(extractLinkTargetSlugs("")).toEqual([]);
  });

  it("extracts the article-slug segment from the 3-segment internal-link form", () => {
    const md =
      "See [the report](/technology/ai/openai-launches-new-model) and " +
      "[the rebuttal](/technology/policy/eu-pushes-back-on-rules).";
    expect(extractLinkTargetSlugs(md)).toEqual([
      "openai-launches-new-model",
      "eu-pushes-back-on-rules",
    ]);
  });

  it("ignores outbound links and 2-segment hub links", () => {
    const md =
      "Sources: [OpenAI](https://openai.com), the [technology hub](/technology), " +
      "and [the analysis](/technology/ai/article-slug).";
    expect(extractLinkTargetSlugs(md)).toEqual(["article-slug"]);
  });

  it("handles multiple occurrences of the same target", () => {
    const md =
      "First mention [a](/cat/sub/target-a). Later, another [a](/cat/sub/target-a).";
    expect(extractLinkTargetSlugs(md)).toEqual(["target-a", "target-a"]);
  });

  it("only matches lowercase-kebab slugs (mirrors the linker's output shape)", () => {
    const md = "Bad: [x](/Cat/Sub/Slug). Good: [y](/cat/sub/slug-1).";
    expect(extractLinkTargetSlugs(md)).toEqual(["slug-1"]);
  });
});

describe("percentile", () => {
  it("returns 0 for an empty list", () => {
    expect(percentile([], 0.95)).toBe(0);
  });

  it("computes the nearest-rank 95th percentile", () => {
    // 20 values 1..20. ceil(0.95 * 20) = 19 -> sorted[18] = 19.
    const values = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(percentile(values, 0.95)).toBe(19);
  });

  it("handles duplicates and unordered input", () => {
    expect(percentile([0, 0, 0, 0, 5, 5, 10], 0.5)).toBe(0);
    expect(percentile([3, 1, 2], 1.0)).toBe(3);
  });

  it("returns the only element for a single-item list at any percentile", () => {
    expect(percentile([7], 0.05)).toBe(7);
    expect(percentile([7], 0.95)).toBe(7);
  });
});
