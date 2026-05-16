-- Techno Times — phase 6: subcategory pillar pages
-- Evergreen 'everything you need to know about X' content rendered above the
-- article grid on each /<category>/<subcategory> page. One pillar per
-- subcategory, refreshed weekly by a separate Modal worker.

create table if not exists public.subcategory_pillars (
  category_slug text not null,
  subcategory_slug text not null,
  -- Editorial fields
  title text not null,                     -- 'Artificial Intelligence: a guide to ...'
  dek text,                                -- one-line subtitle
  overview text not null,                  -- 'What is AI?' opening paragraph (markdown)
  body text not null,                      -- main body with '## ' H2 sections (markdown)
  why_it_matters text,                     -- 2-3 sentences for the at-a-glance card
  -- SEO metadata (same contract as articles)
  focus_keyword text,
  long_tail_keywords text[] not null default '{}',
  power_word text,
  seo_title text,
  seo_description text,
  -- Structured content
  key_terms jsonb,                         -- glossary: [{term, definition}]
  timeline jsonb,                          -- [{year, event}]
  faq jsonb,                               -- [{q, a}]
  related_subcategories text[] not null default '{}',
  -- Cost / ops
  model_used text,
  prompt_tokens int,
  completion_tokens int,
  generation_cost_usd numeric(10, 4),
  last_updated_by_run uuid references public.agent_runs(id) on delete set null,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (category_slug, subcategory_slug)
);

drop trigger if exists subcategory_pillars_touch on public.subcategory_pillars;
create trigger subcategory_pillars_touch
before update on public.subcategory_pillars
for each row execute function public.touch_updated_at();

-- Track which agent run produced/refreshed each pillar (separate from
-- agent_run_articles which is per-article).
create table if not exists public.agent_run_pillars (
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  category_slug text not null,
  subcategory_slug text not null,
  created_at timestamptz not null default now(),
  primary key (run_id, category_slug, subcategory_slug)
);

-- Public RLS — anyone can read pillars; only service role writes.
alter table public.subcategory_pillars enable row level security;
alter table public.agent_run_pillars enable row level security;

drop policy if exists "Public can read pillars" on public.subcategory_pillars;
create policy "Public can read pillars"
  on public.subcategory_pillars for select using (true);
-- No public policy on agent_run_pillars — admin (service role) only.
