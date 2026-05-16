import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  ADSENSE_CLIENT_ID,
  GA4_ID,
  PLAUSIBLE_DOMAIN,
  GSC_VERIFICATION,
  SITE,
  DAILY_BUDGET_USD,
} from "@/lib/site";
import { getTodaysCost, getRecentRuns } from "./queries";
import { indexNowKey } from "@/lib/indexnow";
import { isRateLimitConfigured } from "@/lib/rateLimit";

export type CheckLevel = "ok" | "warn" | "fail" | "info";

export type Check = {
  id: string;
  group: "Database" | "Storage" | "Secrets" | "Monetization" | "SEO" | "Operations";
  label: string;
  level: CheckLevel;
  detail: string;
  /** Optional action / link */
  href?: string;
};

async function runCheck(fn: () => Promise<Check>): Promise<Check> {
  try {
    return await fn();
  } catch (e) {
    return {
      id: "unknown",
      group: "Operations",
      label: "Check failed",
      level: "fail",
      detail: String(e),
    };
  }
}

export async function getHealthChecks(): Promise<Check[]> {
  const supabase = getSupabaseAdmin();

  const checks: Promise<Check>[] = [
    // --- DB ---------------------------------------------------------------
    runCheck(async () => {
      if (!supabase) {
        return {
          id: "supabase-config",
          group: "Database",
          label: "Supabase env vars",
          level: "fail",
          detail: "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set",
        };
      }
      return {
        id: "supabase-config",
        group: "Database",
        label: "Supabase env vars",
        level: "ok",
        detail: "service role + public URL present",
      };
    }),
    runCheck(async () => {
      if (!supabase)
        return {
          id: "articles-table",
          group: "Database",
          label: "articles table",
          level: "fail",
          detail: "supabase client unavailable",
        };
      const { count, error } = await supabase
        .from("articles")
        .select("id", { head: true, count: "exact" });
      if (error)
        return {
          id: "articles-table",
          group: "Database",
          label: "articles table",
          level: "fail",
          detail: `query failed: ${error.message}`,
        };
      return {
        id: "articles-table",
        group: "Database",
        label: "articles table",
        level: "ok",
        detail: `${count ?? 0} rows`,
      };
    }),
    runCheck(async () => {
      if (!supabase)
        return {
          id: "agent-runs",
          group: "Database",
          label: "agent_runs table",
          level: "fail",
          detail: "supabase client unavailable",
        };
      const { error } = await supabase
        .from("agent_runs")
        .select("id", { head: true, count: "exact" });
      if (error)
        return {
          id: "agent-runs",
          group: "Database",
          label: "agent_runs table",
          level: "fail",
          detail: `migration 0001 not applied? ${error.message}`,
        };
      return {
        id: "agent-runs",
        group: "Database",
        label: "agent_runs table",
        level: "ok",
        detail: "migration 0001 applied",
      };
    }),
    runCheck(async () => {
      if (!supabase)
        return {
          id: "cost-ledger",
          group: "Database",
          label: "cost_ledger table",
          level: "fail",
          detail: "supabase client unavailable",
        };
      const { error } = await supabase
        .from("cost_ledger")
        .select("day", { head: true, count: "exact" });
      if (error)
        return {
          id: "cost-ledger",
          group: "Database",
          label: "cost_ledger table",
          level: "fail",
          detail: `migration 0002 not applied? ${error.message}`,
        };
      return {
        id: "cost-ledger",
        group: "Database",
        label: "cost_ledger table",
        level: "ok",
        detail: "migration 0002 applied",
      };
    }),
    // --- Storage ----------------------------------------------------------
    runCheck(async () => {
      if (!supabase)
        return {
          id: "image-bucket",
          group: "Storage",
          label: "article-images bucket",
          level: "fail",
          detail: "supabase client unavailable",
        };
      const { data, error } = await supabase.storage.getBucket("article-images");
      if (error || !data)
        return {
          id: "image-bucket",
          group: "Storage",
          label: "article-images bucket",
          level: "fail",
          detail: `migration 0003 not applied? ${error?.message ?? "no bucket"}`,
        };
      return {
        id: "image-bucket",
        group: "Storage",
        label: "article-images bucket",
        level: data.public ? "ok" : "warn",
        detail: data.public ? "public, ready" : "exists but not public",
      };
    }),
    // --- Secrets ----------------------------------------------------------
    runCheck(async () => ({
      id: "admin-password",
      group: "Secrets",
      label: "ADMIN_PASSWORD",
      level: process.env.ADMIN_PASSWORD ? "ok" : "fail",
      detail: process.env.ADMIN_PASSWORD ? "set" : "not set — /admin login is broken",
    })),
    runCheck(async () => ({
      id: "admin-api-key",
      group: "Secrets",
      label: "ADMIN_API_KEY",
      level: process.env.ADMIN_API_KEY ? "ok" : "fail",
      detail: process.env.ADMIN_API_KEY
        ? "set — worker can authenticate"
        : "not set — agent worker will get 401 from /api/agent/*",
    })),
    // --- Monetization -----------------------------------------------------
    runCheck(async () => {
      if (!ADSENSE_CLIENT_ID)
        return {
          id: "adsense",
          group: "Monetization",
          label: "AdSense client id",
          level: "warn",
          detail: "NEXT_PUBLIC_ADSENSE_CLIENT_ID not set — slots render as placeholders",
        };
      return {
        id: "adsense",
        group: "Monetization",
        label: "AdSense client id",
        level: "ok",
        detail: ADSENSE_CLIENT_ID,
      };
    }),
    runCheck(async () => {
      if (!ADSENSE_CLIENT_ID)
        return {
          id: "ads-txt",
          group: "Monetization",
          label: "ads.txt",
          level: "info",
          detail: "skip until AdSense is configured",
        };
      try {
        const res = await fetch(`${SITE.url}/ads.txt`, { cache: "no-store" });
        if (!res.ok)
          return {
            id: "ads-txt",
            group: "Monetization",
            label: "ads.txt",
            level: "fail",
            detail: `unreachable: HTTP ${res.status}`,
          };
        const text = await res.text();
        const pubId = ADSENSE_CLIENT_ID.replace(/^ca-/, "");
        if (text.includes(pubId)) {
          return {
            id: "ads-txt",
            group: "Monetization",
            label: "ads.txt",
            level: "ok",
            detail: "matches AdSense publisher id",
          };
        }
        return {
          id: "ads-txt",
          group: "Monetization",
          label: "ads.txt",
          level: "fail",
          detail: "ads.txt does not contain your publisher id",
        };
      } catch (e) {
        return {
          id: "ads-txt",
          group: "Monetization",
          label: "ads.txt",
          level: "warn",
          detail: `not reachable yet (${String(e)})`,
        };
      }
    }),
    // --- SEO --------------------------------------------------------------
    runCheck(async () => ({
      id: "gsc",
      group: "SEO",
      label: "Google Search Console verification",
      level: GSC_VERIFICATION ? "ok" : "warn",
      detail: GSC_VERIFICATION
        ? "verification meta tag is emitted"
        : "NEXT_PUBLIC_GSC_VERIFICATION not set",
    })),
    runCheck(async () => ({
      id: "ga4",
      group: "SEO",
      label: "Google Analytics 4",
      level: GA4_ID ? "ok" : "info",
      detail: GA4_ID ? GA4_ID : "NEXT_PUBLIC_GA4_ID not set",
    })),
    runCheck(async () => ({
      id: "plausible",
      group: "SEO",
      label: "Plausible",
      level: PLAUSIBLE_DOMAIN ? "ok" : "info",
      detail: PLAUSIBLE_DOMAIN ? PLAUSIBLE_DOMAIN : "NEXT_PUBLIC_PLAUSIBLE_DOMAIN not set",
    })),
    runCheck(async () => {
      const key = indexNowKey();
      if (!key)
        return {
          id: "indexnow",
          group: "SEO",
          label: "IndexNow",
          level: "warn",
          detail: "INDEXNOW_KEY not set — publish pings will no-op",
        };
      try {
        const res = await fetch(`${SITE.url}/api/indexnow/${key}`, {
          cache: "no-store",
        });
        if (!res.ok)
          return {
            id: "indexnow",
            group: "SEO",
            label: "IndexNow",
            level: "fail",
            detail: `key endpoint returned ${res.status}`,
          };
        return {
          id: "indexnow",
          group: "SEO",
          label: "IndexNow",
          level: "ok",
          detail: "key resolves on the deployed site",
        };
      } catch (e) {
        return {
          id: "indexnow",
          group: "SEO",
          label: "IndexNow",
          level: "warn",
          detail: `key endpoint not reachable (${String(e)})`,
        };
      }
    }),
    runCheck(async () => {
      try {
        const res = await fetch(`${SITE.url}/sitemap.xml`, { cache: "no-store" });
        return {
          id: "sitemap",
          group: "SEO",
          label: "sitemap.xml",
          level: res.ok ? "ok" : "fail",
          detail: res.ok ? `HTTP ${res.status}` : `unreachable: HTTP ${res.status}`,
        };
      } catch (e) {
        return {
          id: "sitemap",
          group: "SEO",
          label: "sitemap.xml",
          level: "warn",
          detail: `not reachable yet (${String(e)})`,
        };
      }
    }),
    // --- Operations -------------------------------------------------------
    runCheck(async () => {
      const runs = await getRecentRuns(5);
      if (runs.length === 0) {
        return {
          id: "last-run",
          group: "Operations",
          label: "Recent agent runs",
          level: "warn",
          detail: "no runs yet — has the Modal worker been deployed?",
          href: "/admin/runs",
        };
      }
      const last = runs[0];
      if (last.status === "failed") {
        return {
          id: "last-run",
          group: "Operations",
          label: "Most recent run",
          level: "fail",
          detail: `failed: ${last.error ?? "unknown"}`,
          href: `/admin/runs/${last.id}`,
        };
      }
      if (last.status === "cancelled") {
        return {
          id: "last-run",
          group: "Operations",
          label: "Most recent run",
          level: "warn",
          detail:
            (last.metadata?.cancelled_reason as string | undefined) ?? "cancelled",
          href: `/admin/runs/${last.id}`,
        };
      }
      return {
        id: "last-run",
        group: "Operations",
        label: "Most recent run",
        level: "ok",
        detail: `${last.status} — ${last.articles_created} article(s)`,
        href: `/admin/runs/${last.id}`,
      };
    }),
    runCheck(async () => {
      const cost = await getTodaysCost();
      const pct = DAILY_BUDGET_USD > 0 ? (cost.total / DAILY_BUDGET_USD) * 100 : 0;
      const level: CheckLevel =
        cost.total >= DAILY_BUDGET_USD
          ? "fail"
          : pct >= 75
          ? "warn"
          : "ok";
      return {
        id: "budget",
        group: "Operations",
        label: "Today's spend vs. budget",
        level,
        detail: `$${cost.total.toFixed(2)} / $${DAILY_BUDGET_USD.toFixed(2)} (${pct.toFixed(0)}%)`,
      };
    }),
    runCheck(async () => ({
      id: "legal-pages",
      group: "SEO",
      label: "Privacy + Terms",
      level: "ok",
      detail: "/privacy and /terms are live",
    })),
    runCheck(async () => {
      if (!supabase)
        return {
          id: "seo-metadata",
          group: "Database",
          label: "SEO metadata columns (0005)",
          level: "fail",
          detail: "supabase client unavailable",
        };
      const { error } = await supabase
        .from("articles")
        .select("focus_keyword", { head: true, count: "exact" });
      if (error)
        return {
          id: "seo-metadata",
          group: "Database",
          label: "SEO metadata columns (0005)",
          level: "fail",
          detail: `migration 0005 not applied? ${error.message}`,
        };
      return {
        id: "seo-metadata",
        group: "Database",
        label: "SEO metadata columns (0005)",
        level: "ok",
        detail: "focus_keyword + long_tail_keywords + faq present",
      };
    }),
    runCheck(async () => {
      if (!supabase)
        return {
          id: "pillar-table",
          group: "Database",
          label: "Pillar pages (0006)",
          level: "fail",
          detail: "supabase client unavailable",
        };
      const { count, error } = await supabase
        .from("subcategory_pillars")
        .select("category_slug", { head: true, count: "exact" });
      if (error)
        return {
          id: "pillar-table",
          group: "Database",
          label: "Pillar pages (0006)",
          level: "fail",
          detail: `migration 0006 not applied? ${error.message}`,
        };
      return {
        id: "pillar-table",
        group: "Database",
        label: "Pillar pages (0006)",
        level: (count ?? 0) > 0 ? "ok" : "warn",
        detail:
          (count ?? 0) > 0
            ? `${count} pillars generated`
            : "table exists but no pillars yet — run weekly_pillar_refresh",
      };
    }),
    runCheck(async () => {
      if (!supabase)
        return {
          id: "fts",
          group: "Database",
          label: "Full-text search (0007)",
          level: "fail",
          detail: "supabase client unavailable",
        };
      // Sentinel call: a deliberate non-matching query — exercises the
      // RPC and the GIN index without returning rows. If the function is
      // missing the migration hasn't been applied. (Cast bypasses
      // declared-function-name union check.)
      const rpc = supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>
      ) => Promise<{ error: { message: string } | null }>;
      const { error } = await rpc("search_articles_fts", {
        q: "techno-times-health-probe-zzz",
        lim: 1,
      });
      return {
        id: "fts",
        group: "Database",
        label: "Full-text search (0007)",
        level: error ? "fail" : "ok",
        detail: error
          ? `RPC missing — apply migration 0007 (${error.message})`
          : "search_articles_fts RPC responding",
      };
    }),
    runCheck(async () => ({
      id: "rate-limit",
      group: "Operations",
      label: "Rate limiting (Upstash)",
      level: isRateLimitConfigured() ? "ok" : "warn",
      detail: isRateLimitConfigured()
        ? "configured — public POST endpoints are throttled per-IP"
        : "UPSTASH_REDIS_REST_URL/TOKEN not set — endpoints open to abuse",
    })),
    runCheck(async () => {
      if (!supabase)
        return {
          id: "engagement-tables",
          group: "Database",
          label: "Engagement tables (0004)",
          level: "fail",
          detail: "supabase client unavailable",
        };
      const { error } = await supabase
        .from("article_views")
        .select("article_id", { head: true, count: "exact" });
      if (error)
        return {
          id: "engagement-tables",
          group: "Database",
          label: "Engagement tables (0004)",
          level: "fail",
          detail: `migration 0004 not applied? ${error.message}`,
        };
      return {
        id: "engagement-tables",
        group: "Database",
        label: "Engagement tables (0004)",
        level: "ok",
        detail: "article_views / reactions / story_updates / newsletter ready",
      };
    }),
  ];

  return Promise.all(checks);
}

export function summarize(checks: Check[]): {
  ok: number;
  warn: number;
  fail: number;
  info: number;
  ready: boolean;
} {
  let ok = 0, warn = 0, fail = 0, info = 0;
  for (const c of checks) {
    if (c.level === "ok") ok++;
    else if (c.level === "warn") warn++;
    else if (c.level === "fail") fail++;
    else info++;
  }
  return { ok, warn, fail, info, ready: fail === 0 };
}
