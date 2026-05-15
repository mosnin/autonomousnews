"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { CATEGORIES } from "@/lib/taxonomy";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="p-1"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-rule">
            <span className="kicker">Sections</span>
            <button
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="p-1"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </svg>
            </button>
          </div>
          <ul className="px-4 py-2">
            {CATEGORIES.map((c) => (
              <li key={c.slug} className="border-b border-rule py-3">
                <Link
                  href={`/${c.slug}`}
                  onClick={() => setOpen(false)}
                  className="block headline text-xl"
                >
                  {c.name}
                </Link>
                <ul className="mt-1 ml-1 grid grid-cols-2 gap-x-3 gap-y-1">
                  {c.subcategories.map((s) => (
                    <li key={s.slug}>
                      <Link
                        href={`/${c.slug}/${s.slug}`}
                        onClick={() => setOpen(false)}
                        className="text-sm text-muted hover:text-accent"
                      >
                        {s.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
