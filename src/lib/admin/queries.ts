import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type AgentRun = {
  id: string;
  trigger: string;
  agent: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  topics_considered: number;
  articles_created: number;
  cost_usd: number | null;
  model: string | null;
  metadata: Record<string, unknown>;
  error: string | null;
  created_at: string;
};

export type AgentLog = {
  id: number;
  run_id: string | null;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AdminArticleRow = {
  id: string;
  slug: string;
  title: string;
  category_slug: string;
  subcategory_slug: string | null;
  status: "draft" | "scheduled" | "published" | "archived";
  is_featured: boolean;
  is_breaking: boolean;
  published_at: string | null;
  updated_at: string;
  created_at: string;
};

export async function getRecentRuns(limit = 50): Promise<AgentRun[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { data } = await supabase
    .from("agent_runs")
    .select(
      "id, trigger, agent, status, started_at, finished_at, duration_ms, topics_considered, articles_created, cost_usd, model, metadata, error, created_at"
    )
    .order("started_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as AgentRun[];
}

export async function getRun(id: string): Promise<AgentRun | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data } = await supabase
    .from("agent_runs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data ?? null) as unknown as AgentRun | null;
}

export async function getRunLogs(runId: string, limit = 500): Promise<AgentLog[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { data } = await supabase
    .from("agent_logs")
    .select("*")
    .eq("run_id", runId)
    .order("created_at", { ascending: true })
    .limit(limit);
  return (data ?? []) as unknown as AgentLog[];
}

export async function getRecentLogs(limit = 200): Promise<AgentLog[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { data } = await supabase
    .from("agent_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as AgentLog[];
}

export async function getRunArticleIds(runId: string): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { data } = await supabase
    .from("agent_run_articles")
    .select("article_id")
    .eq("run_id", runId);
  return (data ?? []).map((r: { article_id: string }) => r.article_id);
}

export async function getAdminArticles(opts: {
  status?: AdminArticleRow["status"];
  category?: string;
  q?: string;
  limit?: number;
}): Promise<AdminArticleRow[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  let query = supabase
    .from("articles")
    .select(
      "id, slug, title, category_slug, subcategory_slug, status, is_featured, is_breaking, published_at, updated_at, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.status) query = query.eq("status", opts.status);
  if (opts.category) query = query.eq("category_slug", opts.category);
  if (opts.q) query = query.ilike("title", `%${opts.q}%`);
  const { data } = await query;
  return (data ?? []) as unknown as AdminArticleRow[];
}

export type AdminStats = {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  runs24h: number;
  failedRuns24h: number;
  articles24h: number;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  todaysCostUsd: number;
  todaysOpenAiUsd: number;
  todaysImageUsd: number;
};

export async function getTodaysCost(): Promise<{
  total: number;
  openai: number;
  image: number;
}> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { total: 0, openai: 0, image: 0 };
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("cost_ledger")
    .select("openai_cost_usd, image_cost_usd, total_cost_usd")
    .eq("day", today)
    .maybeSingle();
  const row = data as
    | { openai_cost_usd: number; image_cost_usd: number; total_cost_usd: number }
    | null;
  return {
    total: Number(row?.total_cost_usd ?? 0),
    openai: Number(row?.openai_cost_usd ?? 0),
    image: Number(row?.image_cost_usd ?? 0),
  };
}

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = getSupabaseAdmin();
  const empty: AdminStats = {
    totalArticles: 0,
    publishedArticles: 0,
    draftArticles: 0,
    runs24h: 0,
    failedRuns24h: 0,
    articles24h: 0,
    lastRunAt: null,
    lastRunStatus: null,
    todaysCostUsd: 0,
    todaysOpenAiUsd: 0,
    todaysImageUsd: 0,
  };
  if (!supabase) return empty;

  const since = new Date(Date.now() - 24 * 3600_000).toISOString();

  const [total, published, draft, runs, failed, articles24h, lastRun, costs] =
    await Promise.all([
      supabase.from("articles").select("id", { head: true, count: "exact" }),
      supabase
        .from("articles")
        .select("id", { head: true, count: "exact" })
        .eq("status", "published"),
      supabase
        .from("articles")
        .select("id", { head: true, count: "exact" })
        .eq("status", "draft"),
      supabase
        .from("agent_runs")
        .select("id", { head: true, count: "exact" })
        .gte("started_at", since),
      supabase
        .from("agent_runs")
        .select("id", { head: true, count: "exact" })
        .eq("status", "failed")
        .gte("started_at", since),
      supabase
        .from("articles")
        .select("id", { head: true, count: "exact" })
        .gte("created_at", since),
      supabase
        .from("agent_runs")
        .select("started_at, status")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      getTodaysCost(),
    ]);

  return {
    totalArticles: total.count ?? 0,
    publishedArticles: published.count ?? 0,
    draftArticles: draft.count ?? 0,
    runs24h: runs.count ?? 0,
    failedRuns24h: failed.count ?? 0,
    articles24h: articles24h.count ?? 0,
    lastRunAt:
      (lastRun.data as { started_at?: string } | null)?.started_at ?? null,
    lastRunStatus:
      (lastRun.data as { status?: string } | null)?.status ?? null,
    todaysCostUsd: costs.total,
    todaysOpenAiUsd: costs.openai,
    todaysImageUsd: costs.image,
  };
}
