import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isAdminAuthed } from "@/lib/admin-auth";
import {
  getRun,
  getRunLogs,
  getRunArticleIds,
  getAdminArticles,
} from "@/lib/admin/queries";
import StatusPill from "@/components/admin/StatusPill";
import { formatDateTime } from "@/lib/admin/format";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const LEVEL_COLOR: Record<string, string> = {
  debug: "text-gray-500",
  info: "text-gray-800",
  warn: "text-yellow-700",
  error: "text-red-700",
};

export default async function RunDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdminAuthed())) redirect("/admin/login");
  const { id } = await params;
  const run = await getRun(id);
  if (!run) notFound();

  const [logs, articleIds] = await Promise.all([
    getRunLogs(id, 1000),
    getRunArticleIds(id),
  ]);

  const supabase = getSupabaseAdmin();
  let articles: Array<{
    id: string;
    slug: string;
    title: string;
    category_slug: string;
    status: string;
  }> = [];
  if (supabase && articleIds.length > 0) {
    const { data } = await supabase
      .from("articles")
      .select("id, slug, title, category_slug, status")
      .in("id", articleIds);
    articles = (data ?? []) as typeof articles;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/runs" className="text-sm underline">
          ← All runs
        </Link>
        <h1 className="text-2xl font-bold mt-2">
          Run <span className="font-mono text-base text-muted">{run.id.slice(0, 8)}</span>
        </h1>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white border border-rule p-4 text-sm">
        <Field label="Agent" value={run.agent} mono />
        <Field label="Trigger" value={run.trigger} />
        <Field label="Status" value={<StatusPill status={run.status} />} />
        <Field label="Model" value={run.model ?? "—"} mono />
        <Field label="Started" value={formatDateTime(run.started_at)} />
        <Field label="Finished" value={formatDateTime(run.finished_at)} />
        <Field
          label="Duration"
          value={run.duration_ms != null ? `${(run.duration_ms / 1000).toFixed(1)}s` : "—"}
        />
        <Field
          label="Cost"
          value={run.cost_usd != null ? `$${Number(run.cost_usd).toFixed(3)}` : "—"}
        />
        <Field label="Topics" value={run.topics_considered} />
        <Field label="Articles" value={run.articles_created} />
      </section>

      {run.error ? (
        <section className="border border-red-300 bg-red-50 p-4">
          <div className="text-xs uppercase tracking-widest text-red-700 mb-1">Error</div>
          <pre className="text-sm whitespace-pre-wrap font-mono">{run.error}</pre>
        </section>
      ) : null}

      {articles.length > 0 ? (
        <section>
          <h2 className="text-lg font-bold mb-3">Articles produced</h2>
          <ul className="bg-white border border-rule divide-y divide-rule">
            {articles.map((a) => (
              <li key={a.id} className="p-3 flex items-center justify-between gap-4">
                <div>
                  <Link
                    href={`/admin/articles/${a.id}`}
                    className="font-medium text-accent underline"
                  >
                    {a.title}
                  </Link>
                  <div className="text-xs text-muted font-mono">{a.category_slug}/{a.slug}</div>
                </div>
                <StatusPill status={a.status} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-lg font-bold mb-3">Logs</h2>
        <div className="bg-black text-gray-100 font-mono text-xs p-4 max-h-[60vh] overflow-auto">
          {logs.length === 0 ? (
            <div className="text-gray-400">No log entries.</div>
          ) : null}
          {logs.map((l) => (
            <div key={l.id} className="whitespace-pre-wrap leading-relaxed">
              <span className="text-gray-500">
                {new Date(l.created_at).toISOString().split("T")[1].replace("Z", "")}
              </span>{" "}
              <span className={`uppercase ${LEVEL_COLOR[l.level] ?? ""}`}>
                [{l.level}]
              </span>{" "}
              {l.message}
              {Object.keys(l.metadata ?? {}).length > 0 ? (
                <span className="text-gray-400"> {JSON.stringify(l.metadata)}</span>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {Object.keys(run.metadata ?? {}).length > 0 ? (
        <section>
          <h2 className="text-lg font-bold mb-3">Metadata</h2>
          <pre className="bg-white border border-rule p-3 text-xs overflow-auto">
            {JSON.stringify(run.metadata, null, 2)}
          </pre>
        </section>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-muted">{label}</div>
      <div className={`mt-0.5 ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
    </div>
  );
}
