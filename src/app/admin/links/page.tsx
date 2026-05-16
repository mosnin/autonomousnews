import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/admin-auth";
import { getLinkReport, type RankedArticle } from "@/lib/admin/links";
import { formatDateTime } from "@/lib/admin/format";

export const dynamic = "force-dynamic";

export default async function AdminLinks() {
  if (!(await isAdminAuthed())) redirect("/admin/login");

  const report = await getLinkReport();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Internal links</h1>
        <p className="text-sm text-muted mt-1">
          Inbound link distribution across published articles. The auto-linker
          rewrites mentions during AI generation; this page surfaces the
          resulting distribution problems without modifying anything.
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Published" value={report.totalArticles} />
        <Stat label="Internal links" value={report.totalInternalLinks} />
        <Stat label="Orphans" value={report.orphans.length} accent={report.orphans.length > 0 ? "bad" : undefined} />
        <Stat
          label="Over-linked (>p95)"
          value={`${report.overLinked.length} (>${report.overLinkedThreshold})`}
        />
      </section>

      <Section
        title="Top 20 inbound"
        description="Articles with the most internal links pointing at them. The deepest hubs in the link graph."
        rows={report.topInbound}
        emptyMessage="No articles have inbound links yet."
        showRank
      />

      <Section
        title="Orphans"
        description="Published articles with zero inbound internal links. Nothing flows to them — the SEO problem to fix."
        rows={report.orphans}
        emptyMessage="No orphans — every published article has at least one inbound link."
      />

      <Section
        title={`Over-linked (above the 95th percentile, > ${report.overLinkedThreshold})`}
        description="Articles in the top 5% of inbound counts. May indicate the linker is over-favoring these phrases."
        rows={report.overLinked}
        emptyMessage="No articles above the 95th-percentile threshold."
        showRank
      />
    </div>
  );
}

function Section({
  title,
  description,
  rows,
  emptyMessage,
  showRank = false,
}: {
  title: string;
  description: string;
  rows: RankedArticle[];
  emptyMessage: string;
  showRank?: boolean;
}) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-muted">{description}</p>
      </div>
      <div className="bg-white border border-rule overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-wash text-left">
            <tr>
              {showRank ? <th className="px-3 py-2 w-12">#</th> : null}
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2 text-right">Inbound</th>
              <th className="px-3 py-2">Published</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={showRank ? 6 : 5}
                  className="px-3 py-8 text-center text-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
            {rows.map((r, i) => (
              <tr key={r.id} className="border-t border-rule">
                {showRank ? (
                  <td className="px-3 py-2 text-muted tabular-nums">{i + 1}</td>
                ) : null}
                <td className="px-3 py-2">
                  <Link
                    href={`/${r.category_slug}/${r.slug}`}
                    target="_blank"
                    className="text-accent underline"
                  >
                    {r.title}
                  </Link>
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {r.category_slug}
                  {r.subcategory_slug ? ` / ${r.subcategory_slug}` : ""}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.inboundCount}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {formatDateTime(r.published_at)}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/admin/articles/${r.id}`}
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
        className={`mt-1 text-2xl font-bold tabular-nums ${
          accent === "bad" ? "text-red-600" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
