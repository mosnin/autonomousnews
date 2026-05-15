import Link from "next/link";
import { CATEGORIES } from "@/lib/taxonomy";
import { SITE } from "@/lib/site";
import MobileMenu from "./MobileMenu";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function SiteHeader() {
  const today = formatDate(new Date());
  return (
    <header className="border-b border-rule bg-white">
      {/* Top utility bar */}
      <div className="hidden md:flex max-w-content mx-auto px-4 items-center justify-between text-[11px] uppercase tracking-widest pt-3">
        <div className="flex items-center gap-4">
          <button aria-label="Search" className="p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
        </div>
        <nav aria-label="Editions" className="flex items-center gap-5 text-ink">
          <Link href="/" className="hover:underline">U.S.</Link>
          <Link href="/world" className="hover:underline">International</Link>
          <Link href="/world/americas" className="hover:underline">Canada</Link>
          <span className="text-muted">Español</span>
          <span className="text-muted">中文</span>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/subscribe"
            className="bg-accent text-white text-[11px] tracking-widest px-3 py-2 hover:opacity-90"
          >
            Subscribe for $1/week
          </Link>
          <Link
            href="/login"
            className="border border-ink text-ink text-[11px] tracking-widest px-3 py-2 hover:bg-wash"
          >
            Log in
          </Link>
        </div>
      </div>

      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3">
        <MobileMenu />
        <Link href="/subscribe" className="bg-accent text-white text-[10px] tracking-widest px-3 py-1.5">
          Subscribe
        </Link>
      </div>

      {/* Nameplate */}
      <div className="max-w-content mx-auto px-4 pt-2 pb-3 md:pt-1 md:pb-4 text-center relative">
        <div className="hidden md:block absolute left-4 top-1 text-[12px] leading-tight text-ink">
          <div>{today}</div>
          <Link href="/todays-paper" className="underline-offset-2 hover:underline">
            Today&rsquo;s Paper
          </Link>
        </div>
        <Link href="/" className="inline-block">
          <h1 className="font-nameplate text-[40px] md:text-[64px] leading-none">
            {SITE.name}
          </h1>
        </Link>
      </div>

      {/* Primary nav */}
      <nav aria-label="Sections" className="border-t border-rule">
        <ul className="max-w-content mx-auto px-2 md:px-4 flex items-center gap-1 md:gap-5 overflow-x-auto text-[14px] md:text-[15px] py-2.5 md:py-3 whitespace-nowrap">
          {CATEGORIES.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/${c.slug}`}
                className="px-2 py-1 text-ink hover:text-accent hover:underline underline-offset-4 font-serif"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
