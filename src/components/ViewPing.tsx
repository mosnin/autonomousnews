"use client";

import { useEffect } from "react";

// Fire-and-forget view counter. Sent ~5 seconds after the page becomes
// visible to filter out bounces. Idempotent per session per article via
// sessionStorage.
export default function ViewPing({ articleId }: { articleId: string }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sessionKey = `tt:viewed:${articleId}`;
    if (sessionStorage.getItem(sessionKey)) return;

    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      sessionStorage.setItem(sessionKey, "1");
      fetch("/api/views", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article_id: articleId }),
      }).catch(() => {
        /* swallow */
      });
    }, 5000);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [articleId]);

  return null;
}
