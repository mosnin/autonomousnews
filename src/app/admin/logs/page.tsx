import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/admin-auth";
import { getRecentLogs } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

const LEVEL_COLOR: Record<string, string> = {
  debug: "text-gray-500",
  info: "text-gray-100",
  warn: "text-yellow-300",
  error: "text-red-400",
};

export default async function AdminLogs() {
  if (!(await isAdminAuthed())) redirect("/admin/login");
  const logs = await getRecentLogs(500);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Logs</h1>
      <p className="text-sm text-muted">
        Streamed from every agent run, newest first. Click a run id to jump to its detail page.
      </p>
      <div className="bg-black text-gray-100 font-mono text-xs p-4 max-h-[75vh] overflow-auto">
        {logs.length === 0 ? (
          <div className="text-gray-400">No logs yet.</div>
        ) : null}
        {logs.map((l) => (
          <div key={l.id} className="whitespace-pre-wrap leading-relaxed">
            <span className="text-gray-500">
              {new Date(l.created_at).toISOString().replace("T", " ").replace("Z", "")}
            </span>{" "}
            {l.run_id ? (
              <Link
                href={`/admin/runs/${l.run_id}`}
                className="text-blue-400 hover:underline"
              >
                {l.run_id.slice(0, 8)}
              </Link>
            ) : (
              <span className="text-gray-500">--------</span>
            )}{" "}
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
    </div>
  );
}
