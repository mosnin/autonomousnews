import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminAuthed } from "@/lib/admin-auth";
import {
  getAdminStats,
  getRecentRuns,
  getAdminArticles,
} from "@/lib/admin/queries";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import StatusPill from "@/components/admin/StatusPill";
import { formatDistanceToNow } from "@/lib/admin/format";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  if (!(await isAdminAuthed())) redirect("/admin/login");

  const supabaseConfigured = !!getSupabaseAdmin();

  const [stats, runs, recentArticles] = await Promise.all([
    getAdminStats(),
    getRecentRuns(8),
    getAdminArticles({ limit: 8 }),
  ]);

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
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-bold">Recent agent runs</h2>
          <Link href="/admin/runs" className="text-sm underline">
            View all
          </Link>
        </div>
        <div className="bg-white border border-rule overflow-x-auto">
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
                    {r.cost_usd != null ? `$${Number(r.cost_usd).toFixed(3)}` : "—"}
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
        <div className="bg-white border border-rule overflow-x-auto">
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
    <div className="bg-white border border-rule p-4">
      <div className="text-xs uppercase tracking-widest text-muted">{label}</div>
      <div
        className={`mt-1 text-2xl font-bold ${
          accent === "bad" ? "text-red-600" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
