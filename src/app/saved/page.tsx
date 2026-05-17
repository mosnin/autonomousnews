"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SavedMeta = Record<string, { title: string; url: string; savedAt: string }>;

export default function SavedPage() {
  const [items, setItems] = useState<Array<{ id: string; title: string; url: string; savedAt: string }>>([]);
  const [loaded, setLoaded] = useState(false);

  function refresh() {
    try {
      const meta: SavedMeta = JSON.parse(localStorage.getItem("tt:saved-meta") ?? "{}");
      const list = Object.entries(meta).map(([id, m]) => ({
        id,
        title: m.title,
        url: m.url,
        savedAt: m.savedAt,
      }));
      list.sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt));
      setItems(list);
      setLoaded(true);
    } catch {
      setLoaded(true);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function remove(id: string) {
    const meta: SavedMeta = JSON.parse(localStorage.getItem("tt:saved-meta") ?? "{}");
    delete meta[id];
    localStorage.setItem("tt:saved-meta", JSON.stringify(meta));
    const ids = new Set<string>(JSON.parse(localStorage.getItem("tt:saved") ?? "[]"));
    ids.delete(id);
    localStorage.setItem("tt:saved", JSON.stringify([...ids]));
    refresh();
  }

  function clearAll() {
    localStorage.setItem("tt:saved-meta", "{}");
    localStorage.setItem("tt:saved", "[]");
    refresh();
  }

  return (
    <div className="max-w-content mx-auto px-4 md:px-8 pt-10 pb-16">
      <header className="rule-bottom pb-6 mb-8">
        <div className="kicker text-muted mb-2">Reading list</div>
        <h1 className="headline text-4xl md:text-5xl mb-3">Saved stories</h1>
        <p className="dek">
          Saved on this device. Not synced to an account &mdash; clearing your
          browser data clears this list.
        </p>
      </header>

      {!loaded ? (
        <p className="dek text-sm">Loading&hellip;</p>
      ) : items.length === 0 ? (
        <p className="dek">
          No saved stories yet. Tap the <strong>Save</strong> button on any
          article to add it here.
        </p>
      ) : (
        <>
          <ol className="space-y-5">
            {items.map((it) => (
              <li key={it.id} className="rule-bottom pb-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <Link href={it.url} className="story-link">
                    <h3 className="headline text-lg md:text-xl">{it.title}</h3>
                  </Link>
                  <div className="byline mt-1 text-[11px] uppercase tracking-kicker">
                    Saved {new Date(it.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(it.id)}
                  className="text-xs font-sans uppercase tracking-kicker text-muted hover:text-red-700"
                >
                  Remove
                </button>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={clearAll}
            className="mt-8 text-xs font-sans uppercase tracking-kicker text-muted hover:text-red-700"
          >
            Clear all
          </button>
        </>
      )}
    </div>
  );
}
