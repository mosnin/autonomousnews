import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/admin-auth";
import { getRecentRuns } from "@/lib/admin/queries";
import StatusPill from "@/components/admin/StatusPill";
import { formatDateTime } from "@/lib/admin/format";

export const dynamic = "force-dynamic";

export default async function AdminRuns() {
  if (!(await isAdminAuthed())) redirect("/admin/login");
  const runs = await getRecentRuns(100);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Agent runs</h1>
      <div className="bg-paper border border-rule overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-wash text-left">
            <tr>
              <th className="px-3 py-2">Started</th>
              <th className="px-3 py-2">Agent</th>
              <th className="px-3 py-2">Trigger</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Topics</th>
              <th className="px-3 py-2">Articles</th>
              <th className="px-3 py-2">Duration</th>
              <th className="px-3 py-2">Cost</th>
              <th className="px-3 py-2">Model</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-muted">
                  No runs yet — the hourly worker hasn&rsquo;t reported in.
                </td>
              </tr>
            ) : null}
            {runs.map((r) => (
              <tr key={r.id} className="border-t border-rule">
                <td className="px-3 py-2 whitespace-nowrap">
                  {formatDateTime(r.started_at)}
                </td>
                <td className="px-3 py-2 font-mono">{r.agent}</td>
                <td className="px-3 py-2">{r.trigger}</td>
                <td className="px-3 py-2"><StatusPill status={r.status} /></td>
                <td className="px-3 py-2 tabular-nums">{r.topics_considered}</td>
                <td className="px-3 py-2 tabular-nums">{r.articles_created}</td>
                <td className="px-3 py-2 tabular-nums">
                  {r.duration_ms != null ? `${(r.duration_ms / 1000).toFixed(1)}s` : "—"}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {r.cost_usd != null ? `$${Number(r.cost_usd).toFixed(2)}` : "—"}
                </td>
                <td className="px-3 py-2 text-xs font-mono">{r.model ?? "—"}</td>
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
    </div>
  );
}
