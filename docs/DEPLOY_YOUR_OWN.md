# Deploy your own Techno Times

A short path from `git clone` to a running autonomous newsroom. For the full
production checklist (custom domain, AdSense, Search Console) see
[`../DEPLOY.md`](../DEPLOY.md).

## 1. Clone and install

```bash
git clone https://github.com/yourorg/technotimes.git
cd technotimes
npm install
cp .env.example .env.local
```

## 2. Database (Supabase)

Easiest for local development — start a local stack:

```bash
npx supabase start          # prints a URL, anon key, and service_role key
```

Apply the migrations in `supabase/migrations/` in filename order, then copy
the URL and keys into `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). For a hosted
project, create one at <https://supabase.com> and run the same migrations
from its SQL editor.

## 3. Configure the masthead and keys

In `.env.local`, set the editor on duty (optional — defaults to a neutral
placeholder) and an admin password:

```bash
NEXT_PUBLIC_EDITOR_NAME="Your Name"
NEXT_PUBLIC_EDITOR_TITLE="Editor, Techno Times"
ADMIN_PASSWORD=choose-a-password
ADMIN_API_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
```

Add `OPENAI_API_KEY`, `NEWSAPI_KEY` and `THENEWSAPI_TOKEN` if you want the
agent pipeline to produce real articles.

## 4. Run the site

```bash
npm run dev                 # http://localhost:3000
```

The homepage renders placeholder content until articles exist. Log in at
`/admin/login` with your `ADMIN_PASSWORD`.

## 5. Run the agents (optional)

```bash
cd agents
pip install -r requirements.txt
python -m technotimes_agents.pipeline   # one pipeline run
```

New articles appear on the site and in `/admin`. Live pipeline stats are
public at `/agents`.

## Containers

`docker compose up` builds and runs the web app; `docker compose run --rm
agents` runs the pipeline once. Keep running `npx supabase start` separately —
Supabase is not containerized here.
