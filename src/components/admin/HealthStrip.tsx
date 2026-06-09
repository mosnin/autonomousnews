import { getHealthChecks, summarize, type Check } from "@/lib/admin/health";

const DOT: Record<Check["level"], string> = {
  ok: "#15803d",
  warn: "#b45309",
  fail: "#b91c1c",
  info: "#6b7280",
};

function StatusDot({ color }: { color: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 8 8" width={8} height={8} className="inline-block shrink-0">
      <circle cx={4} cy={4} r={4} fill={color} />
    </svg>
  );
}

// Compact system-health summary for the admin overview. The full
// check-by-check detail lives behind a <details> so the page stays
// scannable. Formerly a standalone page at /admin/health.
export default async function HealthStrip() {
  let checks: Check[];
  try {
    checks = await getHealthChecks();
  } catch {
    return (
      <div className="border border-rule bg-wash px-4 py-2.5 text-sm font-sans">
        System: status unavailable
      </div>
    );
  }
  const summary = summarize(checks);
  const problems = checks.filter((c) => c.level === "warn" || c.level === "fail");
  const allGreen = problems.length === 0;

  return (
    <details className="border border-rule bg-paper text-sm font-sans">
      <summary className="px-4 py-2.5 cursor-pointer list-none flex items-center gap-3">
        <StatusDot color={summary.fail > 0 ? DOT.fail : summary.warn > 0 ? DOT.warn : DOT.ok} />
        <span>
          {allGreen ? (
            <>System: all {checks.length} checks passing</>
          ) : (
            <>
              System: {summary.fail > 0 ? `${summary.fail} failure${summary.fail === 1 ? "" : "s"}` : null}
              {summary.fail > 0 && summary.warn > 0 ? " · " : null}
              {summary.warn > 0 ? `${summary.warn} warning${summary.warn === 1 ? "" : "s"}` : null}
              {" — "}
              {problems.slice(0, 3).map((c) => c.label).join(", ")}
              {problems.length > 3 ? ` +${problems.length - 3} more` : ""}
            </>
          )}
        </span>
        <span className="ml-auto text-xs text-muted">show all checks</span>
      </summary>
      <div className="border-t border-rule">
        {checks.map((c) => (
          <div key={c.id} className="border-b border-rule last:border-b-0 px-4 py-2.5 flex items-start gap-3">
            <StatusDot color={DOT[c.level]} />
            <div className="min-w-0 flex-1">
              <span className="font-medium">{c.label}</span>
              <span className="text-muted"> — {c.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
