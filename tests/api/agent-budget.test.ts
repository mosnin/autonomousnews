import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeSupabaseMock } from "../helpers/mockSupabase";

const ADMIN_KEY = "test-admin-key";

async function loadRoute(supabaseMock: ReturnType<typeof makeSupabaseMock>) {
  vi.resetModules();
  vi.stubEnv("ADMIN_API_KEY", ADMIN_KEY);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://stub.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "stub-service-role-key");
  vi.stubEnv("DAILY_BUDGET_USD", "10");
  vi.doMock("@/lib/supabase/admin", () => ({
    getSupabaseAdmin: () => supabaseMock.client,
  }));
  return await import("@/app/api/agent/budget/route");
}

function authed() {
  return new Request("http://localhost/api/agent/budget", {
    headers: { Authorization: `Bearer ${ADMIN_KEY}` },
  });
}

describe("GET /api/agent/budget", () => {
  beforeEach(() => vi.resetModules());

  it("rejects unauthenticated", async () => {
    const mock = makeSupabaseMock();
    const { GET } = await loadRoute(mock);
    const res = await GET(new Request("http://localhost/api/agent/budget") as never);
    expect(res.status).toBe(401);
  });

  it("returns remaining budget when under cap", async () => {
    const mock = makeSupabaseMock({
      responses: {
        cost_ledger: { data: { total_cost_usd: 3.5 }, error: null },
      },
    });
    const { GET } = await loadRoute(mock);
    const res = await GET(authed() as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      cap_usd: 10,
      spent_usd: 3.5,
      remaining_usd: 6.5,
      over_budget: false,
    });
  });

  it("returns over_budget=true when spend exceeds cap", async () => {
    const mock = makeSupabaseMock({
      responses: {
        cost_ledger: { data: { total_cost_usd: 12 }, error: null },
      },
    });
    const { GET } = await loadRoute(mock);
    const j = await (await GET(authed() as never)).json();
    expect(j.over_budget).toBe(true);
    expect(j.remaining_usd).toBe(0);
  });

  it("returns zero spend when no row exists yet today", async () => {
    const mock = makeSupabaseMock({
      responses: { cost_ledger: { data: null, error: null } },
    });
    const { GET } = await loadRoute(mock);
    const j = await (await GET(authed() as never)).json();
    expect(j.spent_usd).toBe(0);
    expect(j.over_budget).toBe(false);
  });
});
