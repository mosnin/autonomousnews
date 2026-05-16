import { describe, it, expect } from "vitest";
import { POWER_WORDS, detectPowerWord } from "@/lib/powerWords";

describe("powerWords", () => {
  it("contains at least 25 news-appropriate power words", () => {
    expect(POWER_WORDS.length).toBeGreaterThanOrEqual(25);
  });

  it("all entries are unique", () => {
    const lower = POWER_WORDS.map((w) => w.toLowerCase());
    expect(new Set(lower).size).toBe(POWER_WORDS.length);
  });

  it("detectPowerWord finds the first power word in a title", () => {
    expect(detectPowerWord("Inside the new chip-export rules")).toBe("Inside");
    expect(detectPowerWord("Why AI exports are quietly tightening")).toBe("Why");
  });

  it("is case-insensitive and ignores trailing punctuation", () => {
    expect(detectPowerWord("inside, the deal")).toBe("Inside");
    expect(detectPowerWord("STUNNING new evidence")).toBe("Stunning");
  });

  it("returns null when no power word is present", () => {
    expect(detectPowerWord("A boring routine headline")).toBeNull();
  });
});
