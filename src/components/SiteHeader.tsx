"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  const [date, setDate] = useState<string>("");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setDate(formatDate(new Date()));
    const onScroll = () => setCollapsed(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 bg-paper/85 backdrop-blur supports-[backdrop-filter]:bg-paper/70 transition-shadow ${
        collapsed ? "shadow-[0_1px_0_0_rgb(var(--rule))]" : ""
      }`}
    >
      {/* Utility strip — visible only when full */}
      <div
        className={`max-w-content mx-auto px-4 md:px-8 grid-cols-3 items-center text-[11px] uppercase tracking-kicker pt-3 ${
          collapsed ? "hidden" : "hidden md:grid"
        }`}
      >
        <form action="/search" method="get" className="flex items-center gap-2">
          <button type="submit" aria-label="Search" className="p-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
          <input
            type="search"
            name="q"
            placeholder="Search"
            className="text-[12px] bg-transparent border-b border-rule focus:border-ink outline-none px-1 py-0.5 w-40 normal-case tracking-normal"
          />
        </form>
        <div className="text-center text-muted">{date}</div>
        <div className="flex justify-end gap-5 text-muted">
          <Link href="/about-our-ai" className="hover:text-ink">About Our AI</Link>
          <Link href="/feed.xml" className="hover:text-ink">RSS</Link>
        </div>
      </div>

      {/* Nameplate / wordmark */}
      <div
        className={`max-w-content mx-auto px-4 md:px-8 flex items-center justify-between ${
          collapsed ? "py-2" : "py-4 md:py-6"
        }`}
      >
        <div className="md:hidden">
          <MobileMenu />
        </div>
        <Link href="/" className="flex-1 md:flex-none text-center md:text-left">
          <span
            className={`nameplate inline-block text-ink ${
              collapsed ? "text-2xl md:text-3xl" : "text-4xl md:text-6xl"
            }`}
          >
            {SITE.name}
          </span>
        </Link>
        <Link
          href="/search"
          aria-label="Search"
          className="md:hidden p-2 text-ink"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </Link>
      </div>

      {/* Primary section nav (desktop) */}
      <nav aria-label="Sections" className="hidden md:block border-t border-rule">
        <ul className="max-w-content mx-auto px-4 md:px-8 flex items-center gap-1 lg:gap-2 overflow-x-auto text-[14px] py-2 whitespace-nowrap">
          {CATEGORIES.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/${c.slug}`}
                className="px-3 py-1 text-ink hover:text-accent font-sans font-medium tracking-wide"
                style={{ ["--section" as never]: `var(--section)` }}
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
