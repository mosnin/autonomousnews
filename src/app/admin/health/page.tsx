import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminAuthed } from "@/lib/admin-auth";
import { getHealthChecks, summarize, type Check } from "@/lib/admin/health";

export const dynamic = "force-dynamic";

const LEVEL_BADGE: Record<Check["level"], string> = {
  ok:   "bg-green-100 text-green-800 border-green-300",
  warn: "bg-yellow-100 text-yellow-800 border-yellow-300",
  fail: "bg-red-100 text-red-800 border-red-300",
  info: "bg-gray-100 text-gray-700 border-gray-300",
};
const LEVEL_LABEL: Record<Check["level"], string> = {
  ok: "OK", warn: "Warn", fail: "Fail", info: "Info",
};

export default async function HealthPage() {
  if (!(await isAdminAuthed())) redirect("/admin/login");

  const checks = await getHealthChecks();
  const summary = summarize(checks);

  // Group checks for display
  const groups = new Map<string, Check[]>();
  for (const c of checks) {
    if (!groups.has(c.group)) groups.set(c.group, []);
    groups.get(c.group)!.push(c);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Pre-launch health</h1>
        <form action="/admin/health">
          <button className="text-sm border border-rule px-3 py-1.5 hover:bg-wash">
            Refresh
          </button>
        </form>
      </header>

      <div
        className={`border px-4 py-3 text-sm flex items-center justify-between ${
          summary.fail > 0
            ? "border-red-400 bg-red-50 text-red-800"
            : summary.warn > 0
            ? "border-yellow-400 bg-yellow-50 text-yellow-900"
            : "border-green-400 bg-green-50 text-green-800"
        }`}
      >
        <div>
          {summary.ready ? (
            <strong>Ready to launch.</strong>
          ) : (
            <strong>Not ready: {summary.fail} blocker{summary.fail === 1 ? "" : "s"}.</strong>
          )}{" "}
          {summary.ok} OK · {summary.warn} warning{summary.warn === 1 ? "" : "s"} ·{" "}
          {summary.fail} fail · {summary.info} info
        </div>
        <Link href="/admin" className="underline text-xs">
          Back to overview
        </Link>
      </div>

      {[...groups.entries()].map(([groupName, items]) => (
        <section key={groupName}>
          <h2 className="text-lg font-bold mb-2">{groupName}</h2>
          <div className="bg-white border border-rule">
            {items.map((c) => (
              <div
                key={c.id}
                className="border-b border-rule last:border-b-0 px-4 py-3 flex items-start gap-4"
              >
                <span
                  className={`shrink-0 text-[10px] uppercase tracking-widest px-2 py-1 border ${LEVEL_BADGE[c.level]}`}
                >
                  {LEVEL_LABEL[c.level]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{c.label}</div>
                  <div className="text-sm text-muted break-words">{c.detail}</div>
                </div>
                {c.href ? (
                  <Link
                    href={c.href}
                    className="shrink-0 text-sm text-accent underline whitespace-nowrap"
                  >
                    open
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ))}

      <p className="text-xs text-muted font-sans">
        This page is fully recomputed on every load. Refresh after changes
        to env vars, secrets, or migrations to re-verify.
      </p>
    </div>
  );
}
