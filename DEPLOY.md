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
   Modal will run `hourly_run()` once per hour on its own clock.
4. Smoke-test one manual run:
   ```bash
   modal run modal_app.py
   ```
   Then open `/admin/runs` and confirm the run appears with `succeeded`
   status and at least one article inserted.

## 5. AdSense

1. Apply at <https://www.google.com/adsense/start/>. Use your domain.
2. Approval requires the site to look like a real publication — landing
   page must work, several articles must be live, an `/about-our-ai` page
   (already shipped), a privacy policy, and original content. The agent
   worker handles the original-content requirement once it's been running
   for a day or two.
3. Once approved, set `NEXT_PUBLIC_ADSENSE_CLIENT_ID` in Vercel and
   replace `XXXXXXXXXXXXXXXX` in `public/ads.txt` with your publisher id.

## 6. Google Search Console + IndexNow

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

## 7. Analytics

- **GA4**: Create a property, copy the Measurement ID into
  `NEXT_PUBLIC_GA4_ID`. The root layout already injects the gtag script
  only when this env var is set.
- **Plausible** (optional, privacy-friendly second source): set
  `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`. Sign up at <https://plausible.io>.

## 8. Day-of-launch checks

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

## 9. Things that should NOT be skipped

- **Privacy policy** + **Terms of Service** pages. AdSense requires them.
  Currently the footer links to `/privacy` and `/terms` but those pages
  don't exist yet — add them before going live.
- An email at `corrections@yourdomain.com` that goes somewhere. Linked
  from `/about-our-ai`.
- Run a `modal run modal_app.py` at least twice before the real hourly
  schedule kicks in, to catch config issues without burning budget.
