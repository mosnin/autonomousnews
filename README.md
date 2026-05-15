# Techno Times

An SEO-first, AdSense-ready news site styled after _The New York Times_ and
fed by an hourly autonomous-agent pipeline.

- **Frontend:** Next.js 15 (App Router) + Tailwind + TypeScript
- **Database:** Supabase (Postgres)
- **Agents:** Modal-scheduled workers using the OpenAI Agents SDK
- **Sources:** [newsapi.org](https://newsapi.org/) and
  [thenewsapi.com](https://www.thenewsapi.com/) plus live-web browsing
- **Monetization:** Google AdSense (slot components prewired)

## Topic clusters

Categories and subcategories live in `src/lib/taxonomy.ts`. URLs follow:

- `/<category>` — section landing page
- `/<category>/<subcategory>` — topic cluster page
- `/<category>/<article-slug>` — article page

This shape is the SEO topic-cluster structure: each category is a pillar
page, each subcategory is a sub-pillar, and articles deep-link back to
both.

## Getting started

```bash
cp .env.example .env.local       # fill in Supabase + OpenAI + news API keys
npm install
npm run dev
```

Then run the Supabase migration in `supabase/migrations/0001_init.sql` against
your project.

The homepage renders with placeholder content until articles exist in
Supabase.

## Admin

Visit `/admin/login`. The password is whatever you set in `ADMIN_PASSWORD`.

The dashboard shows:

- Counts and 24-hour activity
- Recent **agent runs** with status, duration, cost, and articles produced
- A full **logs** stream from every run
- Full **article** list with filters, plus per-article publish / feature /
  archive controls

The agent worker reports into the dashboard by POSTing to
`/api/agent/runs`, `/api/agent/logs`, and `/api/agent/articles` with
`Authorization: Bearer $ADMIN_API_KEY`.

## Google AdSense

1. Set `NEXT_PUBLIC_ADSENSE_CLIENT_ID` (e.g. `ca-pub-1234567890123456`).
2. Replace the placeholder publisher id in `public/ads.txt`.
3. Slots are dropped on the home, category, subcategory, and article pages
   through `<AdSlot />`. When no client id is set, slots render an
   "Advertisement" placeholder so layout is preserved.

## Agents

See `agents/README.md` for the Modal worker structure. The Next.js app is
fully decoupled from the worker; they only talk over HTTP.
