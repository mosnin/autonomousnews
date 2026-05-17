"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import MobileMenu from "./MobileMenu";

type Tab = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const ICON_PROPS = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const TABS: Tab[] = [
  {
    href: "/",
    label: "Home",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10h14V10" />
      </svg>
    ),
  },
  {
    href: "/technology",
    label: "Tech",
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 20h8M12 17v3" />
      </svg>
    ),
  },
  {
    href: "/business",
    label: "Business",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M3 21h18" />
        <path d="M5 21V8l7-4 7 4v13" />
        <path d="M9 21v-6h6v6" />
      </svg>
    ),
  },
  {
    href: "/saved",
    label: "Saved",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

export default function MobileTabBar() {
  const pathname = usePathname() ?? "/";
  const [menuOpen, setMenuOpen] = useState(false);

  // Hide on /admin entirely.
  if (pathname.startsWith("/admin")) return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <nav
        aria-label="Bottom navigation"
        className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-paper/95 backdrop-blur border-t border-rule bottom-safe"
      >
        <ul className="grid grid-cols-5 text-center">
          {TABS.map((t) => {
            const active = isActive(t.href);
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className={`flex flex-col items-center justify-center pt-2 pb-1 gap-0.5 text-[10px] font-sans uppercase tracking-kicker ${
                    active ? "text-ink" : "text-muted"
                  }`}
                >
                  <span aria-hidden style={{ color: active ? "rgb(var(--section))" : undefined }}>
                    {t.icon}
                  </span>
                  <span>{t.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex flex-col items-center justify-center pt-2 pb-1 gap-0.5 text-[10px] font-sans uppercase tracking-kicker text-muted w-full"
            >
              <span aria-hidden>
                <svg {...ICON_PROPS}>
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                </svg>
              </span>
              <span>Menu</span>
            </button>
          </li>
        </ul>
      </nav>
      {menuOpen ? <MobileMenu initialOpen onClose={() => setMenuOpen(false)} /> : null}
    </>
  );
}
