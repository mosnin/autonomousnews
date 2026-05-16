import { describe, it, expect, beforeEach, vi } from "vitest";

describe("jsonld.breadcrumbListLd", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
    vi.resetModules();
  });

  it("builds a BreadcrumbList with absolute URLs and 1-indexed positions", async () => {
    const { breadcrumbListLd } = await import("@/lib/jsonld");
    const ld = breadcrumbListLd([
      { name: "Home", url: "/" },
      { name: "Tech", url: "/technology" },
      { name: "An Article", url: "/technology/an-article" },
    ]);
    expect(ld["@type"]).toBe("BreadcrumbList");
    expect(ld.itemListElement.length).toBe(3);
    expect(ld.itemListElement[0].position).toBe(1);
    expect(ld.itemListElement[0].item).toBe("https://example.com/");
    expect(ld.itemListElement[2].item).toBe(
      "https://example.com/technology/an-article"
    );
  });

  it("passes through absolute URLs untouched", async () => {
    const { breadcrumbListLd } = await import("@/lib/jsonld");
    const ld = breadcrumbListLd([
      { name: "External", url: "https://other.example/page" },
    ]);
    expect(ld.itemListElement[0].item).toBe("https://other.example/page");
  });
});
