"use client";

import { useEffect, useState } from "react";

type Props = {
  articleId: string;
  title: string;
  url: string;
};

const SAVED_KEY = "tt:saved";

function readSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(key) ?? "[]"));
  } catch {
    return new Set();
  }
}

// Two quiet actions above the story: Save and Share. Reactions live in
// <ArticleReactions> at the END of the article — asking "was this useful?"
// before someone has read a word is noise.
export default function ArticleToolbar({ articleId, title, url }: Props) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(readSet(SAVED_KEY).has(articleId));
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
    </div>
  );
}
