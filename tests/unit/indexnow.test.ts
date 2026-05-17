import { describe, it, expect, beforeEach, vi } from "vitest";

describe("indexnow.pingIndexNow", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns {skipped:true} when INDEXNOW_KEY is unset", async () => {
    vi.stubEnv("INDEXNOW_KEY", "");
    const { pingIndexNow } = await import("@/lib/indexnow");
    const r = await pingIndexNow(["https://example.com/x"]);
    expect(r).toEqual({ skipped: true });
  });

  it("posts to IndexNow with hex key + correct payload when configured", async () => {
    vi.stubEnv("INDEXNOW_KEY", "abc123");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
    const fetchSpy = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    const { pingIndexNow } = await import("@/lib/indexnow");
    const r = await pingIndexNow([
      "https://example.com/a",
      "https://example.com/b",
    ]);
    expect(r).toMatchObject({ submitted: 2 });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const call = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    const [url, init] = call;
    expect(url).toBe("https://api.indexnow.org/IndexNow");
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body));
    expect(body).toEqual({
      host: "example.com",
      key: "abc123",
      keyLocation: "https://example.com/abc123.txt",
      urlList: [
        "https://example.com/a",
        "https://example.com/b",
      ],
    });
  });

  it("uses the bare /<key>.txt form for keyLocation (not /api/indexnow/<key>)", async () => {
    vi.stubEnv("INDEXNOW_KEY", "deadbeef");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
    const fetchSpy = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    const { pingIndexNow } = await import("@/lib/indexnow");
    await pingIndexNow(["https://example.com/a"]);

    const call = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(call[1].body));
    // IndexNow verifies by GET-ing keyLocation. It must be the spec-mandated
    // /<key>.txt form on the publisher's host, not the internal API route.
    expect(body.keyLocation).toBe("https://example.com/deadbeef.txt");
    expect(body.keyLocation).not.toContain("/api/");
    expect(body.keyLocation).toMatch(/\/deadbeef\.txt$/);
  });

  it("returns skipped when urls list is empty", async () => {
    vi.stubEnv("INDEXNOW_KEY", "abc123");
    const { pingIndexNow } = await import("@/lib/indexnow");
    const r = await pingIndexNow([]);
    expect(r).toEqual({ skipped: true });
  });
});
