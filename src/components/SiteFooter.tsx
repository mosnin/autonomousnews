import Link from "next/link";
import { CATEGORIES } from "@/lib/taxonomy";
import { SITE } from "@/lib/site";

export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-rule mt-16 bg-white">
      <div className="max-w-content mx-auto px-4 py-10">
        <Link href="/" className="font-nameplate text-3xl">
          {SITE.name}
        </Link>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-8">
          {CATEGORIES.map((c) => (
            <div key={c.slug}>
              <Link
                href={`/${c.slug}`}
                className="kicker hover:text-accent"
              >
                {c.name}
              </Link>
              <ul className="mt-3 space-y-1.5">
                {c.subcategories.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={`/${c.slug}/${s.slug}`}
                      className="text-sm text-ink hover:text-accent"
                    >
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 pt-6 border-t border-rule text-xs text-muted flex flex-col md:flex-row gap-2 md:gap-6 justify-between">
          <span>© {year} {SITE.name} Company</span>
          <div className="flex flex-wrap gap-4">
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/sitemap.xml">Sitemap</Link>
            <Link href="/feed.xml">RSS</Link>
            <Link href="/about-our-ai">About Our AI</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
