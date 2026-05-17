"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ArticleSummary } from "@/lib/articles";

type Props = { headlines: ArticleSummary[] };

export default function HeadlineTicker({ headlines }: Props) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || headlines.length <= 1) return;
    const id = setInterval(() => {
      setI((n) => (n + 1) % headlines.length);
    }, 5000);
    return () => clearInterval(id);
  }, [paused, headlines.length]);

  if (headlines.length === 0) return null;

  const h = headlines[i];
  const isLive = h.is_breaking || (h as { is_live?: boolean }).is_live;

  return (
    <div
      className="bg-[rgb(var(--breaking-bg))] text-[rgb(var(--breaking-fg))] text-sm font-sans"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-live="polite"
    >
      <div className="max-w-content mx-auto px-4 md:px-8 py-1.5 flex items-center gap-3">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-kicker text-[10px] shrink-0">
          <span className="relative inline-flex">
            <span className="absolute inline-flex h-2 w-2 rounded-full bg-[rgb(var(--breaking-ping))] opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[rgb(var(--breaking-ping))]" />
          </span>
          {isLive ? "Live" : "Breaking"}
        </span>
        <div className="flex-1 truncate animate-fade-up" key={h.id}>
          <Link
            href={`/${h.category_slug}/${h.slug}`}
            className="hover:underline underline-offset-2"
          >
            {h.title}
          </Link>
        </div>
        {headlines.length > 1 ? (
          <div className="hidden md:flex gap-1 shrink-0">
            {headlines.map((_, n) => (
              <button
                key={n}
                onClick={() => setI(n)}
                aria-label={`Headline ${n + 1}`}
                className={`h-1.5 w-1.5 rounded-full ${n === i ? "bg-[rgb(var(--breaking-ping))]" : "bg-[rgb(var(--breaking-ping))]/40"}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
