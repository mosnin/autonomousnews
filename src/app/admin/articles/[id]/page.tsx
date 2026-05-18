import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isAdminAuthed } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Article } from "@/lib/supabase/types";
import StatusPill from "@/components/admin/StatusPill";
import ConfirmingForm from "@/components/admin/ConfirmingForm";
import { formatDateTime } from "@/lib/admin/format";

const CONFIRM_MESSAGES: Record<string, string> = {
  archive:
    "Archive this article? It will be removed from the public site.",
  unpublish:
    "Move this article back to draft? It will be removed from the public site.",
};

export const dynamic = "force-dynamic";

export default async function AdminArticleDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdminAuthed())) redirect("/admin/login");
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) notFound();

  const { data } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const article = data as Article | null;
  if (!article) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/articles" className="text-sm underline">
        ← All articles
      </Link>

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <StatusPill status={article.status} />
          {article.is_breaking ? <StatusPill status="breaking" /> : null}
          {article.is_featured ? <StatusPill status="featured" /> : null}
        </div>
        <h1 className="text-2xl font-bold">{article.title}</h1>
        {article.dek ? <p className="text-muted">{article.dek}</p> : null}
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-paper border border-rule p-4 text-sm">
        <Field label="Slug" value={article.slug} mono />
        <Field
          label="Path"
          value={`${article.category_slug}/${article.subcategory_slug ?? ""}`}
          mono
        />
        <Field label="Author" value={article.author_name} />
        <Field label="Read time" value={`${article.read_minutes} min`} />
        <Field label="Created" value={formatDateTime(article.created_at)} />
        <Field label="Updated" value={formatDateTime(article.updated_at)} />
        <Field label="Published" value={formatDateTime(article.published_at)} />
        <Field
          label="Public URL"
          value={
            article.status === "published" ? (
              <Link
                href={`/${article.category_slug}/${article.slug}`}
                className="text-accent underline"
                target="_blank"
              >
                /{article.category_slug}/{article.slug}
              </Link>
            ) : (
              "—"
            )
          }
        />
      </section>

      {article.tags?.length ? (
        <section>
          <div className="text-xs uppercase tracking-widest text-muted mb-1">Tags</div>
          <div className="flex flex-wrap gap-2">
            {article.tags.map((t) => (
              <span
                key={t}
                className="text-xs bg-wash border border-rule px-2 py-0.5"
              >
                {t}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {article.fact_check_report ? (
        <FactCheckCard report={article.fact_check_report} />
      ) : null}

      {article.source_urls?.length ? (
        <section>
          <div className="text-xs uppercase tracking-widest text-muted mb-1">Sources</div>
          <ul className="text-sm list-disc pl-5 space-y-1">
            {article.source_urls.map((u) => (
              <li key={u}>
                <a
                  href={u}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline break-all"
                >
                  {u}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-lg font-bold mb-3">Body</h2>
        <div className="bg-paper border border-rule p-4 prose-article max-w-none">
          {article.body.split("\n\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>

      <section className="flex gap-3 flex-wrap">
        <ArticleAction id={article.id} action="publish" label="Publish" disabled={article.status === "published"} />
        <ArticleAction id={article.id} action="unpublish" label="Move to draft" disabled={article.status === "draft"} />
        <ArticleAction id={article.id} action="toggle-featured" label={article.is_featured ? "Unfeature" : "Feature"} />
        <ArticleAction id={article.id} action="toggle-breaking" label={article.is_breaking ? "Unmark breaking" : "Mark breaking"} />
        <ArticleAction id={article.id} action="archive" label="Archive" intent="danger" />
      </section>
    </div>
  );
}

function FactCheckCard({
  report,
}: {
  report: NonNullable<Article["fact_check_report"]>;
}) {
  // Verdict colors: green = shipped clean, amber = soft-fail then re-passed,
  // red = a fail that somehow ended up on a published row (legacy / manual
  // override).
  const verdictColor =
    report.verdict === "pass"
      ? "bg-green-100 text-green-800 border-green-300"
      : report.verdict === "soft_fail"
      ? "bg-amber-100 text-amber-800 border-amber-300"
      : "bg-red-100 text-red-800 border-red-300";

  return (
    <section className="bg-paper border border-rule p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted">
          Fact-check
        </h2>
        <span
          className={`text-xs font-bold uppercase tracking-wider border px-2 py-0.5 ${verdictColor}`}
        >
          {report.verdict}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <Field
          label="Claims checked"
          value={String(report.claims_total)}
        />
        <Field
          label="Unsupported"
          value={String(report.claims_unsupported)}
        />
        <Field label="Model" value={report.model_used || "—"} mono />
        <Field
          label="Cost"
          value={`$${report.cost_usd.toFixed(4)}`}
          mono
        />
      </div>
      {report.verdict !== "pass" ? (
        <details className="text-sm">
          <summary className="cursor-pointer underline">
            Why did this pass?
          </summary>
          <p className="mt-2 text-muted">
            {report.verdict === "soft_fail"
              ? "The first draft had 1-2 unsupported claims. The writer was asked to rewrite once with those claims removed; the rewritten version passed and is what shipped."
              : "This article ships with an unresolved fact-check failure. Either it was published before phase 9 enforcement, or it was manually overridden. Reason: " +
                (report.failure_reason ?? "(none recorded)")}
          </p>
        </details>
      ) : null}
    </section>
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
      <div className={`mt-0.5 break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
    </div>
  );
}

function ArticleAction({
  id,
  action,
  label,
  disabled,
  intent,
}: {
  id: string;
  action: string;
  label: string;
  disabled?: boolean;
  intent?: "danger";
}) {
  const buttonClass = `text-sm px-3 py-1.5 border ${
    intent === "danger"
      ? "border-red-300 text-red-700 hover:bg-red-50"
      : "border-rule hover:bg-wash"
  } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`;
  const inner = (
    <>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      <button disabled={disabled} className={buttonClass}>
        {label}
      </button>
    </>
  );
  const confirmMessage = CONFIRM_MESSAGES[action];
  if (confirmMessage) {
    return (
      <ConfirmingForm
        action="/api/admin/article-action"
        method="post"
        confirmMessage={confirmMessage}
      >
        {inner}
      </ConfirmingForm>
    );
  }
  return (
    <form action="/api/admin/article-action" method="post">
      {inner}
    </form>
  );
}
