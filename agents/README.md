# Techno Times — autonomous news agents

Modal-deployed Python worker that runs every hour, pulls trending topics from
[newsapi.org](https://newsapi.org/) and [thenewsapi.com](https://www.thenewsapi.com/),
drafts long-form articles with the OpenAI Agents SDK, hot-links source images
(with credit) or generates a DALL·E 3 fallback, and publishes through the
Next.js `/api/agent/*` endpoints.

The Next.js app and the agent worker are **independent deployments** — they
only communicate over HTTP using a shared `ADMIN_API_KEY`.

## Pipeline

```
hourly_run()
  └─ GET  /api/agent/budget       ← hard-stop if today's spend ≥ DAILY_BUDGET_USD
  └─ GET  /api/agent/recent-topics ← editor sees recently-published topic_keys
  └─ fetch_trends                  ← newsapi.org + thenewsapi.com (deduped)
  └─ select_topics  (editor)       ← gpt-4o-mini picks N stories and may mark
                                     each as a continuation of an existing
                                     topic_key (→ living update) or new
       └─ for each selection:
            └─ if continuation: GET /api/agent/articles/by-topic-key
                                  → existing body is fed into the writer
            └─ write_article (writer) ← 1,000–1,500-word long-form draft
                                       (separate prompt for *update* vs new)
            └─ generate_fallback_image ← DALL·E 3 only if FRESH article
                                         AND source had no image (we never
                                         regen images on living updates)
            └─ POST /api/agent/articles → upserts on topic_key
                                          (preserves slug + author +
                                          published_at; bumps update_count)
  └─ Mid-run safety: stop if the current run's spend has eaten the
     remaining daily budget
  └─ POST /api/agent/runs (final status: succeeded | failed | cancelled)
  └─ POST /api/agent/cost  (rolls into cost_ledger for the admin banner)
```

Every step streams logs to `/api/agent/logs`, which surface in the `/admin`
dashboard in real time.

### Living-article logic in one line

The editor tags each selection with `existing_topic_key` (either an existing
key it recognizes, or `null` for a new story). The pipeline routes accordingly
— either to a new insert or to a living rewrite that updates the same URL.

## Local development

```bash
cd agents
python -m venv .venv && source .venv/bin/activate
pip install -e .

cp ../.env.example .env       # fill in OPENAI_API_KEY, NEWSAPI_KEY,
                              # THENEWSAPI_TOKEN, ADMIN_API_KEY, SITE_URL
export $(grep -v '^#' .env | xargs)

python -m technotimes_agents.pipeline
```

That runs the pipeline once and prints the result.

## Deploying to Modal

1. Create the Modal secret:
   ```
   modal secret create technotimes-secrets \
       SITE_URL=https://technotimes.com \
       ADMIN_API_KEY=<same value as the Next.js app> \
       OPENAI_API_KEY=<sk-...> \
       NEWSAPI_KEY=<key> \
       THENEWSAPI_TOKEN=<token> \
       DAILY_BUDGET_USD=10
   ```

2. Deploy the app:
   ```
   modal deploy modal_app.py
   ```

Modal will run `hourly_run()` once an hour. To trigger a run manually:

```
modal run modal_app.py
```

## Files

- `modal_app.py` — Modal app definition + hourly schedule
- `technotimes_agents/config.py` — env loader
- `technotimes_agents/sources.py` — newsapi.org + thenewsapi.com clients
- `technotimes_agents/taxonomy.py` — mirror of the site taxonomy + author roster
- `technotimes_agents/api_client.py` — HTTP client + buffered log emitter
- `technotimes_agents/pipeline.py` — full pipeline (editor + writer + image)

The mirror in `taxonomy.py` must stay in sync with `src/lib/taxonomy.ts` and
`src/lib/authors.ts`. If you change one, change the other.

## Budget cap

The site exposes today's spend at `/admin`. When today's cost ledger row
exceeds `DAILY_BUDGET_USD`, the dashboard shows a red banner.

The **worker enforces the cap automatically**:

1. At the start of every run, it calls `GET /api/agent/budget`. If today's
   spend is already at or above the cap, the run is marked `cancelled` with
   `metadata.cancelled_reason = "over_daily_budget"` and exits before any
   OpenAI calls.
2. Mid-run, the worker stops drafting more articles as soon as the
   current-run spend has consumed whatever remained of today's budget when
   the run started.
3. At the end of every run, the worker calls `POST /api/agent/cost` which
   atomically increments today's row in `cost_ledger` via the
   `add_run_cost` SECURITY DEFINER function.
