# Techno Times — first-run runbook

Step-by-step order for the actual launch, designed to **catch problems
before they cost money**. Each step has a verify-before-proceed gate.

## Phase 0 — once, before anything else

- [ ] Read `DEPLOY.md` end to end. Every step here assumes you've done
      provisioning (Supabase + Vercel + Modal accounts exist).

## Phase 1 — the site renders without an agent

Goal: every public page returns 200 and looks like a real publication.

1. Push the branch to Vercel, set every env var listed in `DEPLOY.md` §3.
   Skip `OPENAI_API_KEY` / `NEWSAPI_KEY` / `THENEWSAPI_TOKEN` — those go
   into Modal in Phase 3.
2. Set `ADMIN_PASSWORD` and `ADMIN_API_KEY` to long random strings.
3. Open `/admin/login` → log in → `/admin/health`. Every check should be
   green or info; warns are OK (e.g. AdSense unset). Fails are blockers.
4. Run the preflight CLI **as a draft first** (won't publish anything):
   ```bash
   SITE_URL=https://yourdomain.com ADMIN_API_KEY=… npm run preflight
   ```
   Expect every line green except the "public render checks skipped"
   info line. **Stop and fix anything red** before proceeding.
5. Run preflight again with `--publish`:
   ```bash
   npm run preflight -- --publish
   ```
   Now expect the public-article-renders + sitemap checks to be green
   too. Note the fixture article id printed at the end.
6. Open the fixture article in your browser. It should look right —
   header, drop cap, pull quote, toolbar, breadcrumb chips, related
   stories rail.
7. Archive the fixture from `/admin/articles/<id>`.

**Gate:** if the preflight is not fully green, do not proceed.

## Phase 2 — the site looks real with seeded content

8. Push the 10 seed articles:
   ```bash
   SITE_URL=https://yourdomain.com ADMIN_API_KEY=… npm run seed
   ```
9. Open `/`, `/technology`, `/politics`, `/sports`, `/opinion`. The
   homepage should have a hero, custom landings should fill in with
   real cards, the "Most read" rail will populate over a few hours of
   real traffic.

This is the state you can show off to AdSense, friends, anyone — without
having paid OpenAI a cent yet.

## Phase 3 — the agent worker runs without spending real money

10. Create the Modal secret per `DEPLOY.md` §4 step 2.
11. Deploy:
    ```bash
    cd agents
    modal deploy modal_app.py
    ```
12. **Dry-run first.** Only the cheap editor agent runs; no writer, no
    DALL·E.
    ```bash
    modal run modal_app.py --env DRY_RUN=1
    ```
13. Open `/admin/runs`. Confirm a run with `succeeded` status and:
    - `articles_created = 0`
    - `metadata.cancelled_reason` empty
    - log entries listing the topics the editor *would* have picked
14. Pick one of the editor's selections and verify it would have routed
    to a sensible category. If categories look wrong, refine the editor
    prompt before spending money on writers.

**Gate:** dry-run must finish `succeeded`. If it fails, fix before the
real run.

## Phase 4 — the first real run

15. Trigger a manual full run:
    ```bash
    modal run modal_app.py
    ```
16. Watch `/admin/runs/<id>` as the log entries stream in. Expect:
    - `fetched newsapi` + `fetched thenewsapi`
    - `editor selected topics` with non-zero count
    - one `article published` log per selected topic
    - run completes `succeeded` with `articles_created ≥ 1` and
      `cost_usd` well below `$DAILY_BUDGET_USD`
17. Open one of the produced articles on the public site. Check
    visually that:
    - Cover image renders (either credited source image or DALL·E with
      "AI-generated illustration" caption)
    - Author byline links to the right `/by/<slug>` page
    - Sources block at the bottom lists the source URLs
    - Disclaimer is present
    - JSON-LD scripts (View Page Source) include `NewsArticle` and
      `BreadcrumbList`
18. Check `/admin/health` again. Should now show the run as recent.

## Phase 5 — let it run

19. Trust the Modal hourly schedule.
20. Check `/admin` once a day for the first week. Watch for:
    - Failed runs (red rows)
    - Daily-cost banner going yellow then red
    - `articles_updated` counts climbing as topics keep developing
21. When the site has ~24h of real content, apply to AdSense and submit
    `/sitemap.xml` + `/news-sitemap.xml` to Google Search Console.

## Things that go wrong in practice

- **Run "cancelled" with `over_daily_budget`** → check `/admin` budget
  card. Either bump `DAILY_BUDGET_USD` on Modal or wait for UTC midnight.
- **Editor returned invalid json** → usually a transient OpenAI hiccup.
  Will recover next hour. If it persists, switch `EDITOR_MODEL` to a
  more reliable model.
- **Source images expire** → already handled. Worker re-hosts everything
  in Supabase Storage before publishing. Old DALL·E links in your
  Supabase rows from before this fix should be backfilled if you have
  any.
- **Articles 404 right after publish** → ISR cache lag. Wait 5 minutes
  (the revalidate window) and refresh.
- **`/admin/health` "engagement tables" red** → run migration 0004.
