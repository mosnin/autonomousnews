import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/admin-auth";
import { getAdminArticles } from "@/lib/admin/queries";
import { CATEGORIES } from "@/lib/taxonomy";
import StatusPill from "@/components/admin/StatusPill";
import { formatDateTime } from "@/lib/admin/format";

export const dynamic = "force-dynamic";

type Search = { status?: string; category?: string; q?: string };

export default async function AdminArticles({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  if (!(await isAdminAuthed())) redirect("/admin/login");
  const { status, category, q } = await searchParams;

  const articles = await getAdminArticles({
    status: status as "draft" | "scheduled" | "published" | "archived" | undefined,
    category,
    q,
    limit: 200,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Articles</h1>

      <form className="flex flex-wrap gap-3 items-end" action="/admin/articles">
        <div>
          <label className="block text-xs uppercase tracking-widest text-muted mb-1">Status</label>
          <select name="status" defaultValue={status ?? ""} className="border border-rule px-2 py-1 text-sm">
            <option value="">Any</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-muted mb-1">Category</label>
          <select name="category" defaultValue={category ?? ""} className="border border-rule px-2 py-1 text-sm">
            <option value="">Any</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs uppercase tracking-widest text-muted mb-1">Search title</label>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="search..."
            className="w-full border border-rule px-2 py-1 text-sm"
          />
        </div>
        <button className="bg-ink text-white text-sm px-4 py-1.5" type="submit">
          Filter
        </button>
      </form>

      <div className="bg-paper border border-rule overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-wash text-left">
            <tr>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Flags</th>
              <th className="px-3 py-2">Published</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {articles.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted">
                  No articles match the current filter.
                </td>
              </tr>
            ) : null}
            {articles.map((a) => (
              <tr key={a.id} className="border-t border-rule">
                <td className="px-3 py-2 whitespace-nowrap">
                  {formatDateTime(a.created_at)}
                </td>
                <td className="px-3 py-2">
                  <Link href={`/admin/articles/${a.id}`} className="text-accent underline">
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
                <td className="px-3 py-2 whitespace-nowrap">
                  {formatDateTime(a.published_at)}
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
    </div>
  );
}
