import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/admin/format";
import type {
  AuditRecommendation,
  AuditReport,
} from "@/lib/supabase/types";

type AuditRunSummary = {
  audit_run_id: string;
  date: string;
  articles_audited: number;
  unpublish_count: number;
  correct_count: number;
  keep_count: number;
  total_cost_usd: number;
};

type QueueRow = {
  report: AuditReport;
  article_title: string;
  article_slug: string;
  article_category: string;
};

async function loadAuditData(): Promise<{
  runs: AuditRunSummary[];
  queue: QueueRow[];
  lastRunAt: string | null;
}> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { runs: [], queue: [], lastRunAt: null };
  }

  const since14d = new Date(Date.now() - 14 * 86400_000).toISOString();
  const since30d = new Date(Date.now() - 30 * 86400_000).toISOString();

  // All audit rows in the last 14 days — used to build per-run summaries.
  const { data: recentReports } = await supabase
    .from("audit_reports")
    .select(
      "id, article_id, audited_at, audit_run_id, claims_total, claims_unsupported, drift_from_source, broken_source_count, recommendation, notes, model_used, prompt_tokens, completion_tokens, cost_usd"
    )
    .gte("audited_at", since14d)
    .order("audited_at", { ascending: false });

  const reports: AuditReport[] = (recentReports ?? []) as unknown as AuditReport[];

  // Group by audit_run_id into a daily/per-run summary.
  const runMap = new Map<string, AuditRunSummary>();
  for (const r of reports) {
    const key = r.audit_run_id ?? `solo-${r.id}`;
    let entry = runMap.get(key);
    if (!entry) {
      entry = {
        audit_run_id: key,
        date: r.audited_at,
        articles_audited: 0,
        unpublish_count: 0,
        correct_count: 0,
        keep_count: 0,
        total_cost_usd: 0,
      };
      runMap.set(key, entry);
    }
    entry.articles_audited += 1;
    if (r.recommendation === "unpublish") entry.unpublish_count += 1;
    else if (r.recommendation === "correct") entry.correct_count += 1;
    else entry.keep_count += 1;
    entry.total_cost_usd += Number(r.cost_usd ?? 0);
    if (new Date(r.audited_at).getTime() > new Date(entry.date).getTime()) {
      entry.date = r.audited_at;
    }
  }
  const runs = Array.from(runMap.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Action queue: every 'correct' or 'unpublish' rec from the last 30 days.
  const { data: queueReports } = await supabase
    .from("audit_reports")
    .select(
      "id, article_id, audited_at, audit_run_id, claims_total, claims_unsupported, drift_from_source, broken_source_count, recommendation, notes, model_used, prompt_tokens, completion_tokens, cost_usd"
    )
    .gte("audited_at", since30d)
    .in("recommendation", ["correct", "unpublish"])
    .order("audited_at", { ascending: false })
    .limit(200);

  const queueReportRows: AuditReport[] =
    (queueReports ?? []) as unknown as AuditReport[];

  // Hydrate article titles in one round-trip.
  const articleIds = Array.from(
    new Set(queueReportRows.map((r) => r.article_id).filter(Boolean) as string[])
  );
  const articleMap = new Map<
    string,
    { title: string; slug: string; category_slug: string }
  >();
  if (articleIds.length > 0) {
    const { data: arts } = await supabase
      .from("articles")
      .select("id, title, slug, category_slug")
      .in("id", articleIds);
    for (const a of (arts ?? []) as Array<{
      id: string;
      title: string;
      slug: string;
      category_slug: string;
    }>) {
      articleMap.set(a.id, {
        title: a.title,
        slug: a.slug,
        category_slug: a.category_slug,
      });
    }
  }

  const queue: QueueRow[] = queueReportRows.map((r) => {
    const a = r.article_id ? articleMap.get(r.article_id) : undefined;
    return {
      report: r,
      article_title: a?.title ?? "(deleted article)",
      article_slug: a?.slug ?? "",
      article_category: a?.category_slug ?? "",
    };
  });

  // Last run timestamp comes from the most recent agent_runs row for the auditor.
  const { data: lastRun } = await supabase
    .from("agent_runs")
    .select("started_at")
    .eq("agent", "auditor")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    runs,
    queue,
    lastRunAt: (lastRun as { started_at: string } | null)?.started_at ?? null,
  };
}

export default async function AdminAudits() {

  const { runs, queue, lastRunAt } = await loadAuditData();

  // Read-only settings display values. Mirrors `Config.from_env` defaults.
  const sampleRate = Number(process.env.AUDITOR_SAMPLE_RATE ?? "0.07");
  const checkerModel = process.env.CHECKER_MODEL ?? "gpt-5-mini";

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-xl font-bold">Audits</h2>
        <p className="text-sm text-muted mt-1">
          The nightly auditor re-fetches a sample of recently-published
          articles&rsquo; cited sources from the live web and re-runs the
          fact-checker. These recommendations are advisory &mdash; articles
          are never auto-unpublished.
        </p>
      </header>

      <section>
        <div className="kicker mb-2">Recent audit runs (last 14 days)</div>
        <div className="bg-paper border border-rule overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-wash text-left">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2 text-right">Audited</th>
                <th className="px-3 py-2 text-right">Unpublish</th>
                <th className="px-3 py-2 text-right">Correct</th>
                <th className="px-3 py-2 text-right">Keep</th>
                <th className="px-3 py-2 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted">
                    No audit runs in the last 14 days.
                  </td>
                </tr>
              ) : null}
              {runs.map((r) => (
                <tr key={r.audit_run_id} className="border-t border-rule">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatDateTime(r.date)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.articles_audited}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.unpublish_count > 0 ? (
                      <span className="text-red-700 font-medium">
                        {r.unpublish_count}
                      </span>
                    ) : (
                      r.unpublish_count
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.correct_count > 0 ? (
                      <span className="text-yellow-800">
                        {r.correct_count}
                      </span>
                    ) : (
                      r.correct_count
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.keep_count}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    ${r.total_cost_usd.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="kicker mb-2">Action queue (last 30 days)</div>
        <p className="text-sm text-muted mb-3">
          Every audit report from the last 30 days that recommends a
          correction or unpublish. Resolve by editing or pulling the article
          from its admin detail page.
        </p>
        <div className="bg-paper border border-rule overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-wash text-left">
              <tr>
                <th className="px-3 py-2">Article</th>
                <th className="px-3 py-2">Recommendation</th>
                <th className="px-3 py-2 text-right">Unsupported</th>
                <th className="px-3 py-2 text-right">Broken sources</th>
                <th className="px-3 py-2">Audited</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {queue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted">
                    Action queue is empty. Either nothing has drifted or the
                    auditor hasn&rsquo;t run yet.
                  </td>
                </tr>
              ) : null}
              {queue.map((row) => (
                <tr key={row.report.id} className="border-t border-rule align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium">{row.article_title}</div>
                    {row.report.notes ? (
                      <div className="text-xs text-muted mt-1">
                        {row.report.notes}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <RecommendationPill rec={row.report.recommendation} />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.report.claims_unsupported}/{row.report.claims_total}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.report.broken_source_count}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatDateTime(row.report.audited_at)}
                  </td>
                  <td className="px-3 py-2">
                    {row.report.article_id ? (
                      <Link
                        href={`/admin/articles/${row.report.article_id}`}
                        className="underline text-sm"
                      >
                        Open
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="kicker mb-2">Audit settings</div>
        <div className="bg-paper border border-rule p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <Setting label="Sample rate" value={`${(sampleRate * 100).toFixed(1)}%`} />
          <Setting label="Checker model" value={checkerModel} />
          <Setting
            label="Last run"
            value={lastRunAt ? formatDateTime(lastRunAt) : "—"}
          />
        </div>
      </section>
    </div>
  );
}

function RecommendationPill({ rec }: { rec: AuditRecommendation }) {
  const styles: Record<AuditRecommendation, string> = {
    unpublish: "bg-red-100 text-red-800 border-red-300",
    correct: "bg-yellow-100 text-yellow-900 border-yellow-300",
    keep: "bg-green-100 text-green-800 border-green-300",
  };
  return (
    <span
      className={`inline-block border px-2 py-0.5 text-xs uppercase tracking-wide ${styles[rec]}`}
    >
      {rec}
    </span>
  );
}

function Setting({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 tabular-nums">{value}</div>
    </div>
  );
}
