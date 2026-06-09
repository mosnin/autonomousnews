"use client";

import { useEffect, useState } from "react";

type Props = {
  articleId: string;
  initialUp: number;
  initialDown: number;
};

const REACTED_KEY = "tt:reacted";

function readMap(key: string): Record<string, "up" | "down"> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(key) ?? "{}");
  } catch {
    return {};
  }
}

// End-of-article reaction prompt. Rendered after the body — the reader has
// finished the story, which is the only moment "was this useful?" is a fair
// question. One reaction per device, persisted in localStorage.
export default function ArticleReactions({
  articleId,
  initialUp,
  initialDown,
}: Props) {
  const [reactedAs, setReactedAs] = useState<"up" | "down" | null>(null);
  const [up, setUp] = useState(initialUp);
  const [down, setDown] = useState(initialDown);

  useEffect(() => {
    setReactedAs(readMap(REACTED_KEY)[articleId] ?? null);
  }, [articleId]);

  async function react(value: "up" | "down") {
    if (reactedAs) return; // one reaction per device
    const r = readMap(REACTED_KEY);
    r[articleId] = value;
    localStorage.setItem(REACTED_KEY, JSON.stringify(r));
    setReactedAs(value);
    // Optimistic
    if (value === "up") setUp((n) => n + 1);
    else setDown((n) => n + 1);
    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article_id: articleId, value }),
      });
      if (res.ok) {
        const j = await res.json();
        setUp(j.thumbs_up);
        setDown(j.thumbs_down);
      }
    } catch {
      /* swallow */
    }
  }

  return (
    <div className="my-8 py-6 border-y border-rule text-center font-sans text-sm">
      <div className="kicker text-muted mb-3">Was this story useful?</div>
      <div className="inline-flex items-center gap-3">
        <button
          type="button"
          onClick={() => react("up")}
          disabled={!!reactedAs}
          aria-label={`Mark this article useful — ${up} readers so far`}
          aria-pressed={reactedAs === "up"}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 border border-rule focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
            reactedAs === "up" ? "bg-wash text-ink" : reactedAs ? "text-muted opacity-70" : "hover:bg-wash"
          }`}
        >
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill={reactedAs === "up" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
          </svg>
          <span aria-hidden="true">{up}</span>
        </button>
        <button
          type="button"
          onClick={() => react("down")}
          disabled={!!reactedAs}
          aria-label={`Mark this article not useful — ${down} readers so far`}
          aria-pressed={reactedAs === "down"}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 border border-rule focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
            reactedAs === "down" ? "bg-wash text-ink" : reactedAs ? "text-muted opacity-70" : "hover:bg-wash"
          }`}
        >
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill={reactedAs === "down" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zM17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
          </svg>
          <span aria-hidden="true">{down}</span>
        </button>
      </div>
    </div>
  );
}
