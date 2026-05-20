import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminAuthed } from "@/lib/admin-auth";
import {
  getAdminStats,
  getRecentRuns,
  getAdminArticles,
  getSpendByAgent,
  getSpendSummary,
  getDistributionStatus,
} from "@/lib/admin/queries";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import StatusPill from "@/components/admin/StatusPill";
import { formatDistanceToNow } from "@/lib/admin/format";
import { DAILY_BUDGET_USD } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  if (!(await isAdminAuthed())) redirect("/admin/login");

  const supabaseConfigured = !!getSupabaseAdmin();

  const [stats, runs, recentArticles, spendByAgent, spendSummary] =
    await Promise.all([
      getAdminStats(),
      getRecentRuns(8),
      getAdminArticles({ limit: 8 }),
      getSpendByAgent(30),
      getSpendSummary(),
    ]);

  const distribution = getDistributionStatus();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Overview</h1>
        <form action="/api/admin/trigger-run" method="post">
          <button className="bg-ink text-white text-sm px-4 py-2 hover:opacity-90">
            Trigger run
          </button>
        </form>
      </div>

      {!supabaseConfigured ? (
        <div className="border border-yellow-400 bg-yellow-50 px-4 py-3 text-sm">
          Supabase isn&rsquo;t configured. Set{" "}
          <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> to start seeing data.
        </div>
      ) : null}

      {(() => {
        const pct = DAILY_BUDGET_USD > 0
          ? (stats.todaysCostUsd / DAILY_BUDGET_USD) * 100
          : 0;
        const over = stats.todaysCostUsd >= DAILY_BUDGET_USD;
        const near = pct >= 75 && !over;
        if (!over && !near) return null;
        return (
          <div
            className={`border px-4 py-3 text-sm ${
              over
                ? "border-red-400 bg-red-50 text-red-800"
                : "border-yellow-400 bg-yellow-50 text-yellow-900"
            }`}
          >
            <strong>{over ? "Daily budget exceeded" : "Approaching daily budget"}:</strong>{" "}
            ${stats.todaysCostUsd.toFixed(2)} of ${DAILY_BUDGET_USD.toFixed(2)} used today
            {over ? " — new runs are blocked by the worker." : "."}
          </div>
        );
      })()}

      <section>
        <h2 className="text-lg font-bold mb-3">Spend</h2>
        <div className="bg-paper border border-rule p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SpendRow
              label="Today"
              value={`$${spendSummary.today.toFixed(2)} / $${DAILY_BUDGET_USD.toFixed(2)}`}
              accent={spendSummary.today >= DAILY_BUDGET_USD ? "bad" : undefined}
            />
            <SpendRow
              label="This week"
              value={`$${spendSummary.last7d.toFixed(2)}`}
            />
            <SpendRow
              label="Last 30 days"
              value={`$${spendSummary.last30d.toFixed(2)}`}
            />
          </div>
          <div className="border-t border-rule pt-3">
            <div className="text-xs uppercase tracking-widest text-muted mb-2">
              By agent (30d)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left">
                  <tr className="text-xs uppercase tracking-widest text-muted">
                    <th className="py-2 pr-3 font-normal">Agent</th>
                    <th className="py-2 px-3 font-normal text-right">Cost</th>
                    <th className="py-2 px-3 font-normal text-right">Runs</th>
                    <th className="py-2 px-3 font-normal text-right">Articles</th>
                    <th className="py-2 pl-3 font-normal text-right">Last run</th>
                  </tr>
                </thead>
                <tbody>
                  {spendByAgent.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted">
                        No completed runs in the last 30 days.
                      </td>
                    </tr>
                  ) : null}
                  {spendByAgent.map((row) => (
                    <tr key={row.agent} className="border-t border-rule">
                      <td className="py-2 pr-3">{agentLabel(row.agent)}</td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        ${row.cost_usd.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {row.runs}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {row.articles}
                      </td>
                      <td className="py-2 pl-3 text-right whitespace-nowrap">
                        {row.last_run_at ? formatDistanceToNow(row.last_run_at) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted">
              Includes succeeded + failed runs. In-flight runs excluded.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Articles" value={stats.totalArticles} />
        <Stat label="Published" value={stats.publishedArticles} />
        <Stat label="Drafts" value={stats.draftArticles} />
        <Stat label="Runs (24h)" value={stats.runs24h} />
        <Stat label="Articles (24h)" value={stats.articles24h} />
        <Stat label="Failed runs (24h)" value={stats.failedRuns24h} accent={stats.failedRuns24h > 0 ? "bad" : undefined} />
        <Stat
          label="Last run"
          value={stats.lastRunAt ? formatDistanceToNow(stats.lastRunAt) : "—"}
        />
        <Stat
          label="Last run status"
          value={stats.lastRunStatus ?? "—"}
          accent={stats.lastRunStatus === "failed" ? "bad" : undefined}
        />
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3">Distribution</h2>
        <div className="bg-paper border border-rule p-4">
          <p className="text-sm text-muted mb-3">
            Channels new articles are pushed to. Unconfigured channels are
            skipped silently by the agent worker — set the env var to enable.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {distribution.map((ch) => (
              <div key={ch.key} className="border border-rule p-3">
                <div className="text-sm font-bold">{ch.label}</div>
                <div
                  className={`mt-1 text-xs font-bold uppercase tracking-widest ${
                    ch.configured ? "text-green-600" : "text-muted"
                  }`}
                >
                  {ch.configured ? "Configured" : "Not configured"}
                </div>
                <code className="mt-1 block text-[10px] text-muted">
                  {ch.envVar}
                </code>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3">Tools</h2>
        <div className="bg-paper border border-rule p-4 text-sm">
          <Link href="/admin/links" className="text-accent underline">
            Internal-link quality dashboard
          </Link>
          <span className="text-muted">
            {" "}
            — top inbound, orphans, and over-linked articles.
          </span>
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-bold">Recent agent runs</h2>
          <Link href="/admin/runs" className="text-sm underline">
            View all
          </Link>
        </div>
        <div className="bg-paper border border-rule overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-wash text-left">
              <tr>
                <th className="px-3 py-2">Started</th>
                <th className="px-3 py-2">Agent</th>
                <th className="px-3 py-2">Trigger</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Articles</th>
                <th className="px-3 py-2">Duration</th>
                <th className="px-3 py-2">Cost</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-muted">
                    No runs yet.
                  </td>
                </tr>
              ) : null}
              {runs.map((r) => (
                <tr key={r.id} className="border-t border-rule">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatDistanceToNow(r.started_at)}
                  </td>
                  <td className="px-3 py-2 font-mono">{r.agent}</td>
                  <td className="px-3 py-2">{r.trigger}</td>
                  <td className="px-3 py-2"><StatusPill status={r.status} /></td>
                  <td className="px-3 py-2 tabular-nums">{r.articles_created}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {r.duration_ms != null ? `${(r.duration_ms / 1000).toFixed(1)}s` : "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {r.cost_usd != null ? `$${Number(r.cost_usd).toFixed(2)}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/runs/${r.id}`}
                      className="text-accent underline"
                    >
                      details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-bold">Recent articles</h2>
          <Link href="/admin/articles" className="text-sm underline">
            View all
          </Link>
        </div>
        <div className="bg-paper border border-rule overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-wash text-left">
              <tr>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Flags</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {recentArticles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted">
                    No articles yet.
                  </td>
                </tr>
              ) : null}
              {recentArticles.map((a) => (
                <tr key={a.id} className="border-t border-rule">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatDistanceToNow(a.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/articles/${a.id}`}
                      className="text-accent underline"
                    >
                      {a.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {a.category_slug}
                    {a.subcategory_slug ? ` / ${a.subcategory_slug}` : ""}
                  </td>
                  <td className="px-3 py-2"><StatusPill status={a.status} /></td>
                  <td className="px-3 py-2 text-xs">
                    {a.is_breaking ? "BREAKING " : ""}
                    {a.is_featured ? "FEATURED" : ""}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {a.status === "published" ? (
                      <Link
                        href={`/${a.category_slug}/${a.slug}`}
                        className="underline text-accent"
                        target="_blank"
                      >
                        view
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const AGENT_LABELS: Record<string, string> = {
  "news-scout": "News scout",
  "pillar-refresh": "Pillar refresh",
};

function agentLabel(slug: string): string {
  return AGENT_LABELS[slug] ?? slug;
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "bad";
}) {
  return (
    <div className="bg-paper border border-rule p-4">
      <div className="text-xs uppercase tracking-widest text-muted">{label}</div>
      <div
        className={`mt-1 text-2xl font-bold tabular-nums ${
          accent === "bad" ? "text-red-600" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function SpendRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "bad";
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-muted">{label}</div>
      <div
        className={`mt-1 text-2xl font-bold tabular-nums ${
          accent === "bad" ? "text-red-600" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
