-- Techno Times — phase 2 schema additions
-- Living articles, source image credit, AI disclosure, cost ledger.

-- ARTICLES additions ------------------------------------------------------
alter table public.articles
  add column if not exists topic_key text,                       -- stable identifier per topic, used for dedup/updates
  add column if not exists update_count int not null default 0,  -- bumped each time a living article is rewritten
  add column if not exists last_updated_by_run uuid references public.agent_runs(id) on delete set null,
  add column if not exists image_credit text,                    -- e.g. "Photo: Reuters/Jane Doe"
  add column if not exists image_source_url text,                -- canonical hot-link target
  add column if not exists image_is_ai_generated boolean not null default false,
  add column if not exists image_provider text,                  -- 'newsapi' | 'thenewsapi' | 'dalle-3' | etc.
  add column if not exists ai_disclosed boolean not null default true,
  add column if not exists model_used text,                      -- writer model id
  add column if not exists prompt_tokens int,
  add column if not exists completion_tokens int,
  add column if not exists generation_cost_usd numeric(10, 4);

create unique index if not exists articles_topic_key_unique
  on public.articles (topic_key) where topic_key is not null;
create index if not exists articles_topic_updated_idx
  on public.articles (topic_key, updated_at desc);

-- News sitemap (Google News format) uses publication date window of 48 hours
-- to determine eligibility. No schema change needed; query in the route.


-- AUTHORS ----------------------------------------------------------------
-- The fixed roster lives in code (src/lib/authors.ts) and is mirrored here
-- only so we can filter/join in SQL. The seed is kept in sync by the agent
-- worker on startup.
create table if not exists public.authors (
  slug text primary key,
  name text not null,
  title text not null,
  bio text not null,
  beat text[] not null default '{}',
  sub_beat text[] not null default '{}',
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.authors enable row level security;
drop policy if exists "Public can read authors" on public.authors;
create policy "Public can read authors"
  on public.authors for select using (true);


-- COST LEDGER ------------------------------------------------------------
-- One row per UTC day. The agent worker increments these atomically.
create table if not exists public.cost_ledger (
  day date primary key,
  openai_cost_usd numeric(12, 4) not null default 0,
  image_cost_usd numeric(12, 4) not null default 0,
  total_cost_usd numeric(12, 4) generated always as
    (openai_cost_usd + image_cost_usd) stored,
  articles_created int not null default 0,
  runs_completed int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.cost_ledger enable row level security;
-- No public policy — admin (service-role) only.

create or replace function public.add_run_cost(
  p_openai_cost numeric,
  p_image_cost numeric,
  p_articles int,
  p_runs int
) returns void
language plpgsql security definer as $$
begin
  insert into public.cost_ledger as cl (day, openai_cost_usd, image_cost_usd, articles_created, runs_completed)
  values (
    (now() at time zone 'utc')::date,
    coalesce(p_openai_cost, 0),
    coalesce(p_image_cost, 0),
    coalesce(p_articles, 0),
    coalesce(p_runs, 0)
  )
  on conflict (day) do update set
    openai_cost_usd = cl.openai_cost_usd + excluded.openai_cost_usd,
    image_cost_usd = cl.image_cost_usd + excluded.image_cost_usd,
    articles_created = cl.articles_created + excluded.articles_created,
    runs_completed = cl.runs_completed + excluded.runs_completed,
    updated_at = now();
end;
$$;
