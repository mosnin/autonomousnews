import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/admin-auth";
import { AUTHORS } from "@/lib/authors";
import { findCategory } from "@/lib/taxonomy";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminAuthors() {
  if (!(await isAdminAuthed())) redirect("/admin/login");

  // Pull article counts per author so we can show output stats.
  const supabase = getSupabaseAdmin();
  const counts = new Map<string, number>();
  if (supabase) {
    const { data } = await supabase
      .from("articles")
      .select("author_slug, status")
      .eq("status", "published");
    for (const row of (data ?? []) as Array<{ author_slug: string }>) {
      counts.set(row.author_slug, (counts.get(row.author_slug) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Authors</h1>
        <p className="text-sm text-muted mt-1">
          The fixed reporter roster the agent worker assigns to articles. To
          change, edit <code>src/lib/authors.ts</code> and redeploy.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AUTHORS.map((a) => (
          <div key={a.slug} className="bg-white border border-rule p-4 flex gap-4">
            <div className="w-14 h-14 rounded-full bg-ink text-white flex items-center justify-center font-bold flex-shrink-0">
              {a.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <Link
                  href={`/by/${a.slug}`}
                  target="_blank"
                  className="font-bold text-accent underline truncate"
                >
                  {a.name}
                </Link>
                <span className="text-xs text-muted tabular-nums">
                  {counts.get(a.slug) ?? 0} pub
                </span>
              </div>
              <div className="text-xs text-muted">{a.title}</div>
              <p className="text-sm mt-2">{a.bio}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {a.beat.map((b) => {
                  const cat = findCategory(b);
                  return (
                    <span
                      key={b}
                      className="text-[10px] uppercase tracking-widest bg-wash border border-rule px-1.5 py-0.5"
                    >
                      {cat?.name ?? b}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
