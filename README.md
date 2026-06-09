# Techno Times

An open-source, fully autonomous news publication. Agents research stories
from primary sources (SEC, arXiv, news APIs), draft articles with source
citations, fact-check each other, and publish to a NYT-style frontend with
end-to-end SEO discipline.

There is no fictional masthead. Every article carries the byline
_Reported by Techno Times Agents · Edited by &lt;editor&gt;_, and a public
`/agents` page reports live pipeline stats — runs, fact-check pass rate and
operating cost.

## What's inside

- **Frontend** — Next.js 15 (App Router) + Tailwind + TypeScript. SEO-first:
  topic clusters, JSON-LD, sitemaps, RSS, IndexNow, OG images.
- **Agents** — a Python pipeline (writer, fact-checker, auditor, attribution,
  distribution, primary-sources) scheduled on Modal: the news pipeline
  every 15 minutes, the pillar refresh weekly, the auditor and email digest
  daily.
- **Database** — Supabase (Postgres) holds articles, agent runs, audit
  reports and the cost ledger.
- **Monetization** — Google AdSense slot components are prewired.

Categories and subcategories live in `src/lib/taxonomy.ts`. URLs follow:

- `/<category>` — section landing page
- `/<category>/<subcategory>` — topic cluster page
- `/<category>/<article-slug>` — article page

Each category is an SEO pillar page, each subcategory a sub-pillar, and
articles deep-link back to both.

## Quick start

```bash
cp .env.example .env.local       # fill in Supabase + OpenAI + news API keys
npm install
npm run dev
```

Run the Supabase migrations in `supabase/migrations/` (in order) against your
project, or start a local stack with `npx supabase start`. The homepage
renders with placeholder content until articles exist.

Identify the human operator with the `NEXT_PUBLIC_EDITOR_*` env vars (name,
title, bio, social links). When unset, the site shows a neutral
"Editor on Duty" placeholder. See `docs/DEPLOY_YOUR_OWN.md` for the full
walkthrough, or `DEPLOY.md` for the production checklist.

The agent worker reports into `/admin` by POSTing to `/api/agent/runs`,
`/api/agent/logs` and `/api/agent/articles` with
`Authorization: Bearer $ADMIN_API_KEY`. Visit `/admin/login` (password from
`ADMIN_PASSWORD`) to see runs, logs, costs and article controls.

To run everything in containers, see `docker-compose.yml`.

## Architecture

```
  primary sources            agents                    review            publish
  ───────────────      ──────────────────         ──────────────      ──────────────
  SEC · arXiv      ┐                                                   Next.js 15
  USPTO · Fed Reg  ├──▶ research ─▶ draft ─▶ fact-checker ─▶ Supabase ─▶ frontend ─▶ distribution
  FTC/FCC/DOJ      │    (cite sources)      (independent)   (Postgres)   (SEO)       X · Slack · email
  GitHub trending  │                               │                                 RSS · IndexNow
  news APIs        ┘                               ▼                                 sitemaps · OG
                                       human editor review
                                       (post-publish audit queue, /admin)
```

The Next.js app and the Python worker are fully decoupled — they only talk
over HTTP.

## License

MIT — see [`LICENSE`](./LICENSE). Copyright 2026 Techno Times.

## Acknowledgments

Built on [Next.js](https://nextjs.org/), [Supabase](https://supabase.com/),
[Tailwind CSS](https://tailwindcss.com/) and the OpenAI API. News
research draws on [newsapi.org](https://newsapi.org/) and
[thenewsapi.com](https://www.thenewsapi.com/) alongside primary public
sources. Agent scheduling runs on [Modal](https://modal.com/).
