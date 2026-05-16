#!/usr/bin/env node
/**
 * Preflight validator for a Techno Times deployment.
 *
 * Talks to a live (or local) Techno Times instance via its public + agent
 * APIs and proves the end-to-end pipeline works WITHOUT requiring Modal,
 * OpenAI, or a news provider to be wired up.
 *
 * Usage:
 *   SITE_URL=https://yourdomain.com \
 *   ADMIN_API_KEY=... \
 *   node scripts/preflight.mjs
 *
 *   # local
 *   SITE_URL=http://localhost:3000 ADMIN_API_KEY=... node scripts/preflight.mjs
 *
 * Exit codes:
 *   0 — all checks passed
 *   1 — at least one critical check failed
 *
 * What it does:
 *   1. GET  /api/agent/budget                          (auth + Supabase live)
 *   2. GET  /api/agent/recent-topics                   (table exists, RLS sane)
 *   3. POST /api/agent/articles (fixture)              (insert path)
 *   4. GET  /<category>/<slug> on the public site      (article renders)
 *   5. GET  /sitemap.xml + /news-sitemap.xml           (URLs surface)
 *   6. POST /api/agent/articles (same topic_key, dek)  (living-update path)
 *   7. POST /api/agent/cost                            (cost ledger RPC)
 *   8. Pings the OG image + favicon                    (image renderer)
 *
 * No external services are required. The fixture article is published as
 * a draft by default (--publish to publish), and cleanup hints are printed
 * at the end so you can remove the fixture via /admin if you like.
 */
import { argv, env, exit } from "node:process";

const SITE = (env.SITE_URL ?? "").replace(/\/$/, "");
const KEY = env.ADMIN_API_KEY ?? "";
const SHOULD_PUBLISH = argv.includes("--publish");

if (!SITE || !KEY) {
  console.error("Set SITE_URL and ADMIN_API_KEY env vars.");
  exit(2);
}

const HEADERS = {
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

let pass = 0;
let warn = 0;
let fail = 0;

function tag(level, label, detail = "") {
  const color =
    level === "ok"   ? "\x1b[32m" :
    level === "warn" ? "\x1b[33m" :
    level === "fail" ? "\x1b[31m" : "\x1b[36m";
  const reset = "\x1b[0m";
  const badge = level.toUpperCase().padEnd(4);
  console.log(`${color}${badge}${reset} ${label}${detail ? `  ${detail}` : ""}`);
  if (level === "ok") pass++;
  else if (level === "warn") warn++;
  else if (level === "fail") fail++;
}

async function step(label, fn) {
  try {
    await fn();
  } catch (e) {
    tag("fail", label, e?.message ?? String(e));
  }
}

const ts = Date.now();
const fixtureSlug = `__preflight-${ts}`;
const fixtureTopicKey = `__preflight-${ts}`;

async function jget(path) {
  const r = await fetch(`${SITE}${path}`, { headers: HEADERS, cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}
async function jpost(path, body) {
  const r = await fetch(`${SITE}${path}`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`${r.status} ${r.statusText} ${text.slice(0, 200)}`);
  }
  return r.json();
}

console.log(`\nTechno Times preflight\n  target:  ${SITE}\n  publish: ${SHOULD_PUBLISH}\n`);

await step("budget endpoint reachable (auth + Supabase)", async () => {
  const b = await jget("/api/agent/budget");
  tag(
    "ok",
    "budget endpoint",
    `cap=$${b.cap_usd} spent=$${b.spent_usd} remaining=$${b.remaining_usd}`
  );
});

await step("recent-topics endpoint reachable", async () => {
  const r = await jget("/api/agent/recent-topics?days=1");
  tag("ok", "recent-topics endpoint", `topics_returned=${r.topics?.length ?? 0}`);
});

let insertedId = null;
const FIXTURE = {
  slug: fixtureSlug,
  title: `Preflight check ${new Date(ts).toISOString()}`,
  dek: "This article was inserted by the preflight CLI. Safe to delete.",
  excerpt: "Preflight test article — used only to validate the deployment.",
  body:
    "This is a preflight test article.\n\n## What this proves\n\nYour deployment can accept articles from the agent worker.\n\n>> If you can read this, the full publish loop works end-to-end.\n\nTechno Times — preflight " +
    new Date(ts).toISOString(),
  category_slug: "technology",
  subcategory_slug: "software",
  tags: ["preflight"],
  author_name: "Priya Shah",
  author_slug: "priya-shah",
  source_urls: [],
  status: SHOULD_PUBLISH ? "published" : "draft",
  read_minutes: 1,
  is_breaking: false,
  is_featured: false,
  is_live: false,
  topic_key: fixtureTopicKey,
  ai_disclosed: true,
};

await step("insert fixture article", async () => {
  const r = await jpost("/api/agent/articles", FIXTURE);
  insertedId = r.id;
  tag(
    "ok",
    "insert fixture article",
    `id=${r.id.slice(0, 8)} slug=${r.slug} updated=${r.updated}`
  );
});

if (SHOULD_PUBLISH && insertedId) {
  await step("public article URL renders", async () => {
    const url = `${SITE}/${FIXTURE.category_slug}/${FIXTURE.slug}`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    const html = await r.text();
    if (!html.includes(FIXTURE.title)) {
      throw new Error("article HTML did not include the fixture title");
    }
    tag("ok", "public article URL renders", url);
  });

  await step("sitemap.xml lists the new article", async () => {
    const r = await fetch(`${SITE}/sitemap.xml`, { cache: "no-store" });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    const xml = await r.text();
    if (!xml.includes(`/${FIXTURE.category_slug}/${FIXTURE.slug}`)) {
      // ISR may not have refreshed yet; downgrade to warn.
      tag("warn", "sitemap.xml lists the new article", "not yet — likely an ISR cache lag");
    } else {
      tag("ok", "sitemap.xml lists the new article");
    }
  });

  await step("news-sitemap.xml lists the new article (last 48h)", async () => {
    const r = await fetch(`${SITE}/news-sitemap.xml`, { cache: "no-store" });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    const xml = await r.text();
    if (!xml.includes(`/${FIXTURE.category_slug}/${FIXTURE.slug}`)) {
      tag("warn", "news-sitemap.xml lists the new article", "not yet — ISR cache lag");
    } else {
      tag("ok", "news-sitemap.xml lists the new article");
    }
  });
} else {
  tag("info", "public render checks skipped", "rerun with --publish to verify");
}

await step("living-update path: same topic_key updates in place", async () => {
  const r = await jpost("/api/agent/articles", {
    ...FIXTURE,
    title: FIXTURE.title + " (updated)",
    dek: "Updated dek — preflight living-update path.",
    update_summary: "Preflight update.",
  });
  if (!r.updated) throw new Error("expected updated=true, got false (topic_key match failed)");
  if (r.id !== insertedId)
    throw new Error(`expected same id, got ${r.id.slice(0, 8)} vs ${insertedId?.slice(0, 8)}`);
  tag("ok", "living-update path", `id stable, slug=${r.slug}`);
});

await step("cost ledger atomic RPC", async () => {
  await jpost("/api/agent/cost", {
    openai_cost_usd: 0.0,
    image_cost_usd: 0.0,
    articles: 0,
    runs: 0,
  });
  tag("ok", "cost ledger atomic RPC", "add_run_cost(0,0,0,0) round-trips");
});

await step("OG image renders", async () => {
  const r = await fetch(`${SITE}/opengraph-image`, { cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status}`);
  const ct = r.headers.get("content-type") ?? "";
  if (!ct.includes("image/")) throw new Error(`unexpected content-type ${ct}`);
  tag("ok", "OG image renders", ct);
});

await step("favicon renders", async () => {
  const r = await fetch(`${SITE}/icon`, { cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status}`);
  tag("ok", "favicon renders", r.headers.get("content-type") ?? "");
});

console.log("");
console.log(`  pass ${pass}  warn ${warn}  fail ${fail}`);
if (insertedId) {
  console.log("");
  console.log(`  Fixture article id: ${insertedId}`);
  console.log(`  To clean up:  open /admin/articles/${insertedId}, click 'Archive'.`);
}
exit(fail > 0 ? 1 : 0);
