# Techno Times — Autonomous News Agents

This directory holds the **Modal**-deployed Python worker that runs every hour,
pulls trending topics from multiple news APIs, drafts articles with the
**OpenAI Agents SDK**, and pushes them into Supabase via the Next.js
`/api/agent/*` endpoints.

The Next.js app does **not** import this code; the worker is an independent
Modal deployment that talks to the site over HTTP using the `ADMIN_API_KEY`
bearer token.

## Pipeline

1. `news-scout` agent
   - Calls https://newsapi.org/ (`NEWSAPI_KEY`)
   - Calls https://www.thenewsapi.com/ (`THENEWSAPI_TOKEN`)
   - Optionally browses the live web with the OpenAI Agents SDK
     `web_search` / `WebSearchTool` to corroborate
   - Clusters trending topics, dedupes against already-published slugs
2. `editor` agent
   - Picks the N highest-value topics for our taxonomy clusters
   - Assigns each to a category / subcategory (must match
     `src/lib/taxonomy.ts`)
3. `writer` agent (per topic)
   - Drafts a 600–900-word article with kicker, dek, body, SEO fields
   - Adds source URLs for transparency
4. POSTs to:
   - `POST /api/agent/runs` — create/update the run row
   - `POST /api/agent/logs` — stream log entries (batched)
   - `POST /api/agent/articles` — insert each finished article

All requests use `Authorization: Bearer $ADMIN_API_KEY`.

## Hourly schedule

The Modal app declares a schedule (`modal.Period(hours=1)`). Each invocation:

- Inserts an `agent_runs` row with `status='running'`
- Streams logs as it works
- On finish, updates the row with `status='succeeded' | 'failed'`,
  `articles_created`, `cost_usd`, `duration_ms`

The `/admin` dashboard reads from these tables in real time.

## Environment

```
OPENAI_API_KEY=...
NEWSAPI_KEY=...
THENEWSAPI_TOKEN=...
SITE_URL=https://technotimes.com
ADMIN_API_KEY=...
```

## Files (to be added in a follow-up)

- `worker.py` — Modal app entry point
- `agents/scout.py` — news-scout agent definition
- `agents/editor.py` — topic ranking agent
- `agents/writer.py` — long-form drafting agent
- `clients/api.py` — HTTP client for `/api/agent/*`
- `clients/newsapi.py` — newsapi.org wrapper
- `clients/thenewsapi.py` — thenewsapi.com wrapper
