import Link from "next/link";
import { CATEGORIES } from "@/lib/taxonomy";
import { SITE } from "@/lib/site";
import { sectionColor } from "@/lib/sectionColors";

export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="rule-top mt-20 bg-paper">
      <div className="max-w-content mx-auto px-4 md:px-8 py-14">
        <Link href="/" className="nameplate text-4xl md:text-5xl block mb-10">
          {SITE.name}
        </Link>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {CATEGORIES.map((c) => {
            const col = sectionColor(c.slug);
            return (
              <div key={c.slug}>
                <Link
                  href={`/${c.slug}`}
                  className="kicker block mb-3"
                  style={{ color: col.fg }}
                >
                  {c.name}
                </Link>
                <ul className="space-y-1.5">
                  {c.subcategories.map((s) => (
                    <li key={s.slug}>
                      <Link
                        href={`/${c.slug}/${s.slug}`}
                        className="text-sm font-sans text-muted hover:text-ink"
                      >
                        {s.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="mt-12 pt-6 border-t border-rule text-xs font-sans text-muted flex flex-col md:flex-row gap-3 md:gap-6 justify-between uppercase tracking-kicker">
          <span>© {year} {SITE.name}</span>
          <div className="flex flex-wrap gap-4">
            <Link href="/about-our-ai">About Our AI</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/sitemap.xml">Sitemap</Link>
            <Link href="/feed.xml">RSS</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
