import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeSupabaseMock } from "../helpers/mockSupabase";

async function loadModule(path: string, mock: ReturnType<typeof makeSupabaseMock>) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://stub.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "stub");
  vi.doMock("@/lib/supabase/admin", () => ({
    getSupabaseAdmin: () => mock.client,
  }));
  return await import(path);
}

describe("POST /api/views", () => {
  beforeEach(() => vi.resetModules());

  it("400 without article_id", async () => {
    const mock = makeSupabaseMock();
    const { POST } = await loadModule("@/app/api/views/route", mock);
    const r = await POST(
      new Request("http://localhost/api/views", {
        method: "POST",
        headers: { "user-agent": "Mozilla/5.0 real" },
        body: JSON.stringify({}),
      }) as never
    );
    expect(r.status).toBe(400);
  });

  it("ignores common bot user-agents", async () => {
    const mock = makeSupabaseMock();
    const { POST } = await loadModule("@/app/api/views/route", mock);
    const r = await POST(
      new Request("http://localhost/api/views", {
        method: "POST",
        headers: { "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" },
        body: JSON.stringify({ article_id: "a1" }),
      }) as never
    );
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, ignored: true });
    expect(mock.client.rpc).not.toHaveBeenCalled();
  });

  it("records a view for a real UA", async () => {
    const mock = makeSupabaseMock();
    const { POST } = await loadModule("@/app/api/views/route", mock);
    const r = await POST(
      new Request("http://localhost/api/views", {
        method: "POST",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Chrome/130.0",
        },
        body: JSON.stringify({ article_id: "a1" }),
      }) as never
    );
    expect(r.status).toBe(200);
    expect(mock.client.rpc).toHaveBeenCalledWith("record_article_view", {
      p_article_id: "a1",
    });
  });
});

describe("POST /api/reactions", () => {
  beforeEach(() => vi.resetModules());

  it("rejects invalid value", async () => {
    const mock = makeSupabaseMock();
    const { POST } = await loadModule("@/app/api/reactions/route", mock);
    const r = await POST(
      new Request("http://localhost/api/reactions", {
        method: "POST",
        body: JSON.stringify({ article_id: "a1", value: "shrug" }),
      }) as never
    );
    expect(r.status).toBe(400);
  });

  it("records up / down and returns totals", async () => {
    const mock = makeSupabaseMock({
      responses: {
        article_reactions: { data: { thumbs_up: 3, thumbs_down: 1 }, error: null },
      },
    });
    const { POST } = await loadModule("@/app/api/reactions/route", mock);
    const r = await POST(
      new Request("http://localhost/api/reactions", {
        method: "POST",
        body: JSON.stringify({ article_id: "a1", value: "up" }),
      }) as never
    );
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({
      ok: true,
      thumbs_up: 3,
      thumbs_down: 1,
    });
    expect(mock.client.rpc).toHaveBeenCalledWith("record_article_reaction", {
      p_article_id: "a1",
      p_value: "up",
    });
  });
});

describe("POST /api/newsletter", () => {
  beforeEach(() => vi.resetModules());

  it("400 for an invalid email", async () => {
    const mock = makeSupabaseMock();
    const { POST } = await loadModule("@/app/api/newsletter/route", mock);
    const r = await POST(
      new Request("http://localhost/api/newsletter", {
        method: "POST",
        body: JSON.stringify({ email: "not-an-email" }),
      }) as never
    );
    expect(r.status).toBe(400);
  });

  it("stores a valid email with a source", async () => {
    const mock = makeSupabaseMock({
      responses: {
        newsletter_subscribers: { data: null, error: null },
      },
    });
    const { POST } = await loadModule("@/app/api/newsletter/route", mock);
    const r = await POST(
      new Request("http://localhost/api/newsletter", {
        method: "POST",
        body: JSON.stringify({ email: "Reader@Example.COM", source: "home-rail" }),
      }) as never
    );
    expect(r.status).toBe(200);
    const touch = mock.interactions.find((i) => i.table === "newsletter_subscribers");
    expect(touch).toBeDefined();
    const upsertCall = touch!.ops.find((o) => o.op === "upsert");
    expect(upsertCall).toBeDefined();
    const payload = upsertCall!.args[0] as { email: string; source: string };
    expect(payload.email).toBe("reader@example.com"); // lowercased
    expect(payload.source).toBe("home-rail");
  });
});
