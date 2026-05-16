"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { CATEGORIES } from "@/lib/taxonomy";

type Props = {
  initialOpen?: boolean;
  onClose?: () => void;
};

export default function MobileMenu({ initialOpen = false, onClose }: Props) {
  const [open, setOpen] = useState(initialOpen);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    onClose?.();
  };

  return (
    <>
      {!initialOpen ? (
        <button
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="p-1 text-ink"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 bg-paper text-ink overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-rule">
            <span className="kicker text-muted">Sections</span>
            <button aria-label="Close menu" onClick={close} className="p-1 text-ink">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </svg>
            </button>
          </div>
          <ul className="px-4 pb-24">
            {CATEGORIES.map((c) => (
              <li key={c.slug} className="border-b border-rule py-3" data-section={c.slug}>
                <div
                  className="section-ribbon"
                  style={{ background: `var(--section-color)`, ["--section-color" as never]: `var(--section)` }}
                />
                <Link
                  href={`/${c.slug}`}
                  onClick={close}
                  className="headline text-2xl block"
                >
                  {c.name}
                </Link>
                <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                  {c.subcategories.map((s) => (
                    <li key={s.slug}>
                      <Link
                        href={`/${c.slug}/${s.slug}`}
                        onClick={close}
                        className="text-sm text-muted hover:text-ink font-sans"
                      >
                        {s.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
            <li className="pt-6 flex flex-wrap gap-4 text-sm font-sans text-muted">
              <Link href="/about-our-ai" onClick={close}>About Our AI</Link>
              <Link href="/feed.xml" onClick={close}>RSS</Link>
              <Link href="/sitemap.xml" onClick={close}>Sitemap</Link>
            </li>
          </ul>
        </div>
      ) : null}
    </>
  );
}
