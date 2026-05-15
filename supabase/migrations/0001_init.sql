-- Techno Times initial schema
-- Run in the Supabase SQL editor, or via `supabase db push`.

create extension if not exists pgcrypto;

-- ARTICLES ----------------------------------------------------------------
create type article_status as enum ('draft', 'scheduled', 'published', 'archived');

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  dek text,
  body text not null default '',
  excerpt text,
  cover_image_url text,
  cover_image_alt text,
  category_slug text not null,
  subcategory_slug text,
  tags text[] not null default '{}',
  author_name text not null default 'Techno Times Staff',
  author_slug text not null default 'staff',
  source_urls text[] not null default '{}',
  status article_status not null default 'draft',
  read_minutes int not null default 3,
  is_featured boolean not null default false,
  is_breaking boolean not null default false,
  seo_title text,
  seo_description text,
  seo_keywords text[] not null default '{}',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_status_published_idx
  on public.articles (status, published_at desc);
create index if not exists articles_category_idx
  on public.articles (category_slug, published_at desc);
create index if not exists articles_subcategory_idx
  on public.articles (category_slug, subcategory_slug, published_at desc);
create index if not exists articles_featured_idx
  on public.articles (is_featured, published_at desc) where is_featured = true;
create index if not exists articles_tags_idx on public.articles using gin (tags);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists articles_touch_updated on public.articles;
create trigger articles_touch_updated
before update on public.articles
for each row execute function public.touch_updated_at();


-- AGENT RUNS --------------------------------------------------------------
create type agent_run_status as enum (
  'queued', 'running', 'succeeded', 'failed', 'cancelled'
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  trigger text not null default 'cron',          -- 'cron' | 'manual' | 'webhook'
  agent text not null,                            -- e.g. 'news-scout', 'writer'
  status agent_run_status not null default 'queued',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms int,
  topics_considered int not null default 0,
  articles_created int not null default 0,
  cost_usd numeric(10, 4),
  model text,
  metadata jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists agent_runs_started_idx
  on public.agent_runs (started_at desc);
create index if not exists agent_runs_status_idx
  on public.agent_runs (status, started_at desc);


-- AGENT LOGS --------------------------------------------------------------
create type agent_log_level as enum ('debug', 'info', 'warn', 'error');

create table if not exists public.agent_logs (
  id bigserial primary key,
  run_id uuid references public.agent_runs(id) on delete cascade,
  level agent_log_level not null default 'info',
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists agent_logs_run_idx
  on public.agent_logs (run_id, created_at);
create index if not exists agent_logs_created_idx
  on public.agent_logs (created_at desc);


-- ARTICLE-RUN LINK --------------------------------------------------------
-- Track which run produced which article (an article may also be edited
-- by later runs).
create table if not exists public.agent_run_articles (
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (run_id, article_id)
);


-- RLS ---------------------------------------------------------------------
alter table public.articles enable row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_logs enable row level security;
alter table public.agent_run_articles enable row level security;

-- Public read of published articles only
drop policy if exists "Public can read published articles" on public.articles;
create policy "Public can read published articles"
  on public.articles for select
  using (status = 'published');

-- Service role does everything (default). No public policies on agent_* tables
-- so the anon/auth roles cannot read them; the admin dashboard must use the
-- service role via a server-side route handler.
