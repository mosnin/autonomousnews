import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeSupabaseMock } from "../helpers/mockSupabase";

// Module under test imports getSupabaseAdmin + pingIndexNow + SITE.
// We stub those before importing the route.

const ADMIN_KEY = "test-admin-key";

function bodyFor(over: Record<string, unknown> = {}) {
  return JSON.stringify({
    slug: "openai-launches-x",
    title: "OpenAI Launches X",
    body: "Paragraph one.\n\nParagraph two.",
    category_slug: "technology",
    subcategory_slug: "ai-and-ml",
    status: "published",
    tags: ["openai", "ai"],
    source_urls: ["https://source.example/story"],
    topic_key: "technology-newkey",
    author_name: "Mira Chen",
    author_slug: "mira-chen",
    ...over,
  });
}

async function loadRoute(supabaseMock: ReturnType<typeof makeSupabaseMock>) {
  vi.resetModules();
  vi.stubEnv("ADMIN_API_KEY", ADMIN_KEY);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://stub.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "stub-service-role-key");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
  // Suppress real IndexNow ping
  vi.stubEnv("INDEXNOW_KEY", "");
  vi.doMock("@/lib/supabase/admin", () => ({
    getSupabaseAdmin: () => supabaseMock.client,
  }));
  return await import("@/app/api/agent/articles/route");
}

function authedRequest(body: string) {
  return new Request("http://localhost/api/agent/articles", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ADMIN_KEY}`,
      "Content-Type": "application/json",
    },
    body,
  });
}

describe("POST /api/agent/articles", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("rejects unauthenticated requests", async () => {
    const mock = makeSupabaseMock();
    const { POST } = await loadRoute(mock);
    const req = new Request("http://localhost/api/agent/articles", {
      method: "POST",
      body: bodyFor(),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it("inserts when no topic_key is provided (bypasses lookup)", async () => {
    const mock = makeSupabaseMock({
      responses: {
        articles: { data: { id: "new-id" }, error: null },
        agent_run_articles: { data: null, error: null },
      },
    });
    const { POST } = await loadRoute(mock);
    // No topic_key => route skips the lookup branch entirely.
    const res = await POST(
      authedRequest(bodyFor({ topic_key: undefined })) as never
    );
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.id).toBe("new-id");
    expect(j.updated).toBe(false);
    expect(j.slug).toBe("openai-launches-x");
    const articleTouches = mock.interactions.filter((i) => i.table === "articles");
    expect(articleTouches.length).toBe(1);
  });

  it("updates in place when topic_key matches existing article", async () => {
    let firstArticlesCall = true;
    const mock = makeSupabaseMock({
      responses: {
        // First articles hit = lookup, second = update (no result needed)
        articles: { data: { id: "existing-id", slug: "existing-slug", category_slug: "technology", published_at: "2026-01-01T00:00:00Z", update_count: 2, author_slug: "mira-chen", author_name: "Mira Chen" }, error: null },
        agent_run_articles: { data: null, error: null },
        story_updates: { data: null, error: null },
      },
    });
    void firstArticlesCall;
    const { POST } = await loadRoute(mock);
    const res = await POST(
      authedRequest(bodyFor({ status: "published", run_id: "run-1" })) as never
    );
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.id).toBe("existing-id");
    // The route returns `updated: !isNew` => when it found an existing match,
    // updated should be true.
    expect(j.updated).toBe(true);
    // Slug preserved on living update.
    expect(j.slug).toBe("existing-slug");

    // story_updates should have been written.
    const storyTouch = mock.interactions.find((i) => i.table === "story_updates");
    expect(storyTouch).toBeDefined();
  });

  it("returns 400 when a required field is missing", async () => {
    const mock = makeSupabaseMock();
    const { POST } = await loadRoute(mock);
    const res = await POST(
      authedRequest(bodyFor({ title: undefined })) as never
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for an unknown category_slug", async () => {
    const mock = makeSupabaseMock();
    const { POST } = await loadRoute(mock);
    const res = await POST(
      authedRequest(bodyFor({ category_slug: "not-a-section" })) as never
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when subcategory doesn't belong to the category", async () => {
    const mock = makeSupabaseMock();
    const { POST } = await loadRoute(mock);
    const res = await POST(
      authedRequest(bodyFor({ subcategory_slug: "not-a-real-sub" })) as never
    );
    expect(res.status).toBe(400);
  });
});
