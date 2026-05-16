"use client";

import { useEffect, useState } from "react";

type Props = {
  articleId: string;
  title: string;
  url: string;
  initialUp: number;
  initialDown: number;
};

const SAVED_KEY = "tt:saved";
const REACTED_KEY = "tt:reacted";

function readSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(key) ?? "[]"));
  } catch {
    return new Set();
  }
}

function readMap(key: string): Record<string, "up" | "down"> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(key) ?? "{}");
  } catch {
    return {};
  }
}

// Inline toolbar above the article body. Save / Listen / Thumbs reactions.
// Everything persists in localStorage; no account required.
export default function ArticleToolbar({
  articleId,
  title,
  url,
  initialUp,
  initialDown,
}: Props) {
  const [saved, setSaved] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [reactedAs, setReactedAs] = useState<"up" | "down" | null>(null);
  const [up, setUp] = useState(initialUp);
  const [down, setDown] = useState(initialDown);

  useEffect(() => {
    setSaved(readSet(SAVED_KEY).has(articleId));
    setReactedAs(readMap(REACTED_KEY)[articleId] ?? null);
  }, [articleId]);

  function toggleSaved() {
    const s = readSet(SAVED_KEY);
    if (s.has(articleId)) s.delete(articleId);
    else s.add(articleId);
    localStorage.setItem(SAVED_KEY, JSON.stringify([...s]));
    // Mirror full metadata so /saved can render without DB lookups.
    const meta = JSON.parse(localStorage.getItem("tt:saved-meta") ?? "{}");
    if (s.has(articleId)) {
      meta[articleId] = { title, url, savedAt: new Date().toISOString() };
    } else {
      delete meta[articleId];
    }
    localStorage.setItem("tt:saved-meta", JSON.stringify(meta));
    setSaved(s.has(articleId));
  }

  function listen() {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) {
      alert("Your browser doesn't support speech synthesis.");
      return;
    }
    if (synth.speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const body = document.querySelector(".prose-article");
    const text = body ? (body.textContent ?? "") : "";
    if (!text) return;
    const u = new SpeechSynthesisUtterance(text.slice(0, 30000));
    u.rate = 1;
    u.pitch = 1;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(u);
  }

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
    <div className="flex flex-wrap items-center gap-2 md:gap-3 py-3 my-6 border-y border-rule font-sans text-sm">
      <button
        type="button"
        onClick={toggleSaved}
        aria-pressed={saved}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 border border-rule hover:bg-wash transition-colors ${
          saved ? "bg-wash" : ""
        }`}
      >
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        {saved ? "Saved" : "Save"}
      </button>

      <button
        type="button"
        onClick={listen}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rule hover:bg-wash"
        aria-pressed={speaking}
      >
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
        {speaking ? "Stop" : "Listen"}
      </button>

      <button
        type="button"
        onClick={async () => {
          if (navigator.share) {
            try {
              await navigator.share({ title, url });
            } catch {
              /* user cancelled */
            }
          } else {
            await navigator.clipboard.writeText(url);
            alert("Link copied");
          }
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rule hover:bg-wash"
      >
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Share
      </button>

      <div className="flex-1" />

      <button
        type="button"
        onClick={() => react("up")}
        disabled={!!reactedAs}
        aria-label={`Mark this article useful — ${up} readers so far`}
        aria-pressed={reactedAs === "up"}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 border border-rule ${
          reactedAs === "up" ? "bg-wash text-ink" : reactedAs ? "opacity-40" : "hover:bg-wash"
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
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 border border-rule ${
          reactedAs === "down" ? "bg-wash text-ink" : reactedAs ? "opacity-40" : "hover:bg-wash"
        }`}
      >
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill={reactedAs === "down" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zM17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
        </svg>
        <span aria-hidden="true">{down}</span>
      </button>
    </div>
  );
}
