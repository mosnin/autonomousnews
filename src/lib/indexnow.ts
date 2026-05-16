import { SITE } from "./site";

const ENDPOINTS = [
  "https://api.indexnow.org/IndexNow",
  // Optional engine-specific endpoints if you want to be explicit:
  // "https://www.bing.com/IndexNow",
  // "https://yandex.com/indexnow",
];

export function indexNowKey(): string | null {
  return process.env.INDEXNOW_KEY ?? null;
}

// Submit one or more URLs to IndexNow. No-ops if INDEXNOW_KEY isn't set.
export async function pingIndexNow(urls: string[]): Promise<{
  submitted: number;
  responses: Array<{ endpoint: string; status: number }>;
} | { skipped: true }> {
  const key = indexNowKey();
  if (!key || urls.length === 0) return { skipped: true };

  const host = new URL(SITE.url).host;
  const body = JSON.stringify({
    host,
    key,
    keyLocation: `${SITE.url}/${key}.txt`,
    urlList: urls,
  });

  const responses = await Promise.all(
    ENDPOINTS.map(async (endpoint) => {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          cache: "no-store",
        });
        return { endpoint, status: res.status };
      } catch {
        return { endpoint, status: 0 };
      }
    })
  );

  return { submitted: urls.length, responses };
}
