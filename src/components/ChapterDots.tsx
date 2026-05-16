"use client";

import { useEffect, useState } from "react";

type Chapter = { id: string; text: string };

// Lightweight in-page navigator. Reads h2 elements inside the article body
// and renders a vertical list of dots, one per heading. Active dot follows
// the scroll position; clicking a dot scrolls to that heading.
export default function ChapterDots({ chapters }: { chapters: Chapter[] }) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (chapters.length === 0) return;
    const onScroll = () => {
      let active = 0;
      for (let i = 0; i < chapters.length; i++) {
        const el = document.getElementById(chapters[i].id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top - 120 <= 0) active = i;
        else break;
      }
      setActiveIdx(active);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [chapters]);

  if (chapters.length === 0) return null;

  return (
    <nav
      aria-label="Chapters"
      className="hidden xl:flex fixed right-6 top-1/2 -translate-y-1/2 z-30 flex-col gap-3"
    >
      {chapters.map((c, i) => (
        <a
          key={c.id}
          href={`#${c.id}`}
          className="group flex items-center gap-3 text-right"
          title={c.text}
        >
          <span
            className={`text-[11px] uppercase tracking-kicker font-sans transition-opacity ${
              i === activeIdx ? "opacity-100 text-ink" : "opacity-0 group-hover:opacity-70 text-muted"
            }`}
          >
            {c.text.length > 28 ? c.text.slice(0, 26) + "…" : c.text}
          </span>
          <span
            className={`block rounded-full transition-all ${
              i === activeIdx ? "h-3 w-3" : "h-2 w-2"
            }`}
            style={{
              background: i === activeIdx ? "var(--section)" : "rgb(var(--rule))",
            }}
            aria-hidden
          />
        </a>
      ))}
    </nav>
  );
}
