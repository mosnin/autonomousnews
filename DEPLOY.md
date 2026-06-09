# Deploying Techno Times

End-to-end checklist. Order matters — Supabase first, then Vercel, then Modal,
then the SEO surfaces. Most of this is one-time setup.

## 1. Supabase

1. Create a new project at <https://supabase.com>. Pick a region near your
   audience (e.g. `us-east-1`).
2. From the project SQL editor, run **in order**:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_living_articles_and_costs.sql`
   - `supabase/migrations/0003_image_storage.sql`
3. The third migration creates a public `article-images` storage bucket. Verify
   it exists under **Storage → article-images** in the dashboard.
4. Collect three values from **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only — never
     leak into the browser)

## 2. Domain + secrets you'll need

Generate these once and reuse:

- `ADMIN_PASSWORD` — cookie-gated `/admin` login.
- `ADMIN_API_KEY` — long random string. The Modal worker uses it as a
  bearer token to call `/api/agent/*`. Generate with
  `python -c "import secrets; print(secrets.token_urlsafe(32))"`.
- `INDEXNOW_KEY` — 32-char random hex. Used to verify ownership when the
  app pings IndexNow on every publish.
- Decide your `DAILY_BUDGET_USD` (default `10`). The worker halts when
  today's spend hits this cap.

## 3. Vercel

1. Import the repo into Vercel. Framework preset: **Next.js**.
2. Set the following **environment variables** (Project → Settings →
   Environment Variables → Production + Preview):

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | from step 1 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from step 1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | from step 1 |
   | `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.com` |
   | `NEXT_PUBLIC_SITE_NAME` | `Techno Times` |
   | `ADMIN_PASSWORD` | from step 2 |
   | `ADMIN_API_KEY` | from step 2 |
   | `INDEXNOW_KEY` | from step 2 |
   | `DAILY_BUDGET_USD` | `10` (or your number) |
   | `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | `ca-pub-...` (once approved) |
   | `NEXT_PUBLIC_GA4_ID` | `G-...` |
   | `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | `yourdomain.com` (optional) |
   | `NEXT_PUBLIC_GSC_VERIFICATION` | from Google Search Console |

3. Add your custom domain (Project → Settings → Domains). Vercel will issue
   the TLS cert automatically.
4. Trigger a deploy. The build prerenders all 16 category landing pages and
   the 15 author pages.

## 4. Modal (agent worker)

1. Install Modal locally and authenticate:
   ```bash
   pip install modal
   modal token new
   ```
2. Create the secret with all the values the worker needs:
   ```bash
   modal secret create technotimes-secrets \
       SITE_URL=https://yourdomain.com \
       ADMIN_API_KEY=<same as Vercel> \
       OPENAI_API_KEY=<sk-...> \
       NEWSAPI_KEY=<from newsapi.org> \
       THENEWSAPI_TOKEN=<from thenewsapi.com> \
       DAILY_BUDGET_USD=10
   ```
3. Deploy:
   ```bash
   cd agents
   modal deploy modal_app.py
   ```
   Modal will run `quarter_hourly_run()` every 15 minutes on its own clock.
4. **Dry-run smoke test** (recommended before the first real run — costs
   only the editor agent's tokens, no writer or DALL·E calls):
   ```bash
   modal run modal_app.py --env DRY_RUN=1
   ```
   Open `/admin/runs` and confirm a `succeeded` run appears with
   `metadata.cancelled_reason = null`, `articles_created = 0`, and log
   entries listing the topics the editor would have picked. If anything
   here is wrong, fix it before spending money on a real run.
5. **First real run:**
   ```bash
   modal run modal_app.py
   ```
   Watch `/admin/runs` for a row with `articles_created ≥ 1` and
   `status = succeeded`. Open one of the articles in the public site
   from the admin row.

## 5. Validate end-to-end with the preflight CLI

Independent of Modal, you can prove the whole publish loop works:

```bash
SITE_URL=https://yourdomain.com \
ADMIN_API_KEY=<same value you put in Vercel + Modal> \
npm run preflight -- --publish
```

The script inserts a fixture article, confirms it renders on the public
site, runs the living-update path on the same `topic_key`, exercises the
cost-ledger RPC, and pings the OG/icon endpoints. It prints a fixture id
at the end so you can archive it from `/admin/articles/<id>`.

## 6. Seed sample articles (optional, makes the site look real on day one)

```bash
SITE_URL=https://yourdomain.com \
ADMIN_API_KEY=<your key> \
npm run seed
```

This publishes 10 well-crafted sample articles across Tech / Business /
Science / World / Politics / Climate / Sports / Culture so the homepage
and all the custom landings have real content before the Modal worker's
first cron tick. Re-running the script triggers the living-update path
(idempotent — no duplicates).

## 7. AdSense

1. Apply at <https://www.google.com/adsense/start/>. Use your domain.
2. Approval requires the site to look like a real publication — landing
   page must work, several articles must be live, an `/about-our-ai` page
   (already shipped), a privacy policy, and original content. The agent
   worker handles the original-content requirement once it's been running
   for a day or two.
3. Once approved, set `NEXT_PUBLIC_ADSENSE_CLIENT_ID` in Vercel and
   replace `XXXXXXXXXXXXXXXX` in `public/ads.txt` with your publisher id.

## 8. Google Search Console + IndexNow

1. Add your domain to **Google Search Console**
   (<https://search.google.com/search-console>).
2. Use the **HTML tag** verification method and copy the `content="..."`
   value into `NEXT_PUBLIC_GSC_VERIFICATION` in Vercel. Redeploy and
   verify.
3. In Search Console, **Sitemaps**, submit both:
   - `https://yourdomain.com/sitemap.xml`
   - `https://yourdomain.com/news-sitemap.xml`
4. IndexNow: pick one of:
   - **Easier**: drop a file `public/<INDEXNOW_KEY>.txt` containing the
     key value, then commit + redeploy. IndexNow expects to find the key
     at `/<key>.txt`.
   - **Or**: configure a Vercel rewrite from `/<key>.txt` →
     `/api/indexnow/<key>` (the route already exists). Add to
     `vercel.json`:
     ```json
     { "rewrites": [{ "source": "/:key.txt", "destination": "/api/indexnow/:key" }] }
     ```
     (Use cautiously — this also catches `ads.txt`, so prefer the static
     file approach.)

## 9. Analytics

- **GA4**: Create a property, copy the Measurement ID into
  `NEXT_PUBLIC_GA4_ID`. The root layout already injects the gtag script
  only when this env var is set.
- **Plausible** (optional, privacy-friendly second source): set
  `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`. Sign up at <https://plausible.io>.

## 10. Day-of-launch checks

- [ ] `https://yourdomain.com/` → loads and shows real articles
- [ ] `https://yourdomain.com/sitemap.xml` → 200, lists every URL
- [ ] `https://yourdomain.com/news-sitemap.xml` → 200, lists last 48h
- [ ] `https://yourdomain.com/feed.xml` → 200, valid RSS
- [ ] `https://yourdomain.com/robots.txt` → references both sitemaps
- [ ] `https://yourdomain.com/admin/login` → can log in
- [ ] `/admin` shows a successful run + at least one published article
- [ ] Share-debugging
  ([Twitter Card Validator](https://cards-dev.twitter.com/validator))
  shows the auto-generated OG image
- [ ] `/admin` budget banner reflects today's spend

## 11. Things that should NOT be skipped

- **Privacy policy** + **Terms of Service** pages. AdSense requires them.
  Currently the footer links to `/privacy` and `/terms` but those pages
  don't exist yet — add them before going live.
- An email at `corrections@yourdomain.com` that goes somewhere. Linked
  from `/about-our-ai`.
- Run a `modal run modal_app.py` at least twice before the real 15-minute
  schedule kicks in, to catch config issues without burning budget.

## Distribution & primary-source keys (optional)

All optional — every feature below no-ops gracefully when its key is unset.

- **`X_BEARER_TOKEN`** — enables the X (Twitter) auto-poster: every fresh
  article is tweeted within seconds of publish. Create an app at
  developer.x.com and use the OAuth 2.0 bearer token. Skipped = no tweets.
- **`SLACK_WEBHOOK_URL`** / **`DISCORD_WEBHOOK_URL`** — push every fresh
  article into a channel. Create an incoming webhook in your workspace /
  server settings. Skipped = no posts.
- **`RESEND_API_KEY`** — enables the daily 13:00 UTC email digest to all
  confirmed newsletter subscribers. Free key at resend.com. Skipped =
  digest cron exits cleanly without sending.
- **`PATENTSVIEW_API_KEY`** — enables USPTO patent ingestion as a primary
  source. Free key at patentsview.org. Skipped = the patents source is
  excluded; the other seven feeds carry the run.
- **`GITHUB_TOKEN`** — raises the rate limit for the GitHub-trending
  source. Any classic token with no scopes works. Skipped = best-effort
  unauthenticated requests.
- **`CHECKER_MODEL`** — the fact-checker model (default `gpt-5-mini`).
  Keep it a different family from `WRITER_MODEL`; the checker exists to
  catch the writer's correlated errors.
