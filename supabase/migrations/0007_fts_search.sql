-- Techno Times — phase 7: Postgres full-text search
--
-- Replaces the ILIKE '%q%' search on articles with a tsvector + GIN index
-- and a websearch_to_tsquery RPC that returns ranked results. The
-- ILIKE path stays as a fallback in app code in case this migration
-- hasn't been applied yet on an environment.
--
-- Weighting: A=title, B=dek+focus_keyword, C=excerpt+long-tail keywords.
-- This makes a query like "AI export controls" rank a piece titled
-- 'New AI export controls...' above one that only mentions the phrase
-- in passing inside the excerpt.

alter table public.articles
  add column if not exists search_tsv tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')),                                                                'A') ||
    setweight(to_tsvector('english', coalesce(dek, '')),                                                                  'B') ||
    setweight(to_tsvector('english', coalesce(focus_keyword, '')),                                                        'B') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')),                                                              'C') ||
    setweight(to_tsvector('english', coalesce(array_to_string(long_tail_keywords, ' '), '')),                             'C')
  ) stored;

create index if not exists articles_search_tsv_idx
  on public.articles using gin(search_tsv);

-- Public, ranked search RPC. Returns the same column set the
-- ArticleSummary TS type expects so we don't pay for body/HTML over the
-- wire. websearch_to_tsquery handles user-friendly syntax — quotes for
-- phrases, '-' for negation, OR for either-or — without throwing on
-- malformed input.
create or replace function public.search_articles_fts(q text, lim int default 30)
returns table (
  id bigint,
  slug text,
  title text,
  dek text,
  excerpt text,
  cover_image_url text,
  cover_image_alt text,
  category_slug text,
  subcategory_slug text,
  author_name text,
  author_slug text,
  is_breaking boolean,
  is_featured boolean,
  is_live boolean,
  published_at timestamptz,
  read_minutes int,
  rank real
)
language sql
stable
security definer
set search_path = public
as $$
  with parsed as (select websearch_to_tsquery('english', coalesce(q, '')) as tsq)
  select
    a.id, a.slug, a.title, a.dek, a.excerpt,
    a.cover_image_url, a.cover_image_alt,
    a.category_slug, a.subcategory_slug,
    a.author_name, a.author_slug,
    a.is_breaking, a.is_featured, a.is_live,
    a.published_at, a.read_minutes,
    ts_rank_cd(a.search_tsv, parsed.tsq) as rank
  from public.articles a, parsed
  where a.status = 'published'
    and parsed.tsq is not null
    and a.search_tsv @@ parsed.tsq
  order by rank desc, a.published_at desc nulls last
  limit greatest(coalesce(lim, 30), 1);
$$;

grant execute on function public.search_articles_fts(text, int) to anon, authenticated, service_role;

-- Same treatment for pillars so the topic guides can show up in search
-- alongside articles. Pillars don't have a 'status' column — every row
-- is publishable — so the RPC just filters by the tsquery.
alter table public.subcategory_pillars
  add column if not exists search_tsv tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')),                                                                'A') ||
    setweight(to_tsvector('english', coalesce(dek, '')),                                                                  'B') ||
    setweight(to_tsvector('english', coalesce(focus_keyword, '')),                                                        'B') ||
    setweight(to_tsvector('english', coalesce(overview, '')),                                                             'C') ||
    setweight(to_tsvector('english', coalesce(why_it_matters, '')),                                                       'C')
  ) stored;

create index if not exists subcategory_pillars_search_tsv_idx
  on public.subcategory_pillars using gin(search_tsv);

create or replace function public.search_pillars_fts(q text, lim int default 10)
returns table (
  category_slug text,
  subcategory_slug text,
  title text,
  dek text,
  rank real
)
language sql
stable
security definer
set search_path = public
as $$
  with parsed as (select websearch_to_tsquery('english', coalesce(q, '')) as tsq)
  select
    p.category_slug, p.subcategory_slug, p.title, p.dek,
    ts_rank_cd(p.search_tsv, parsed.tsq) as rank
  from public.subcategory_pillars p, parsed
  where parsed.tsq is not null
    and p.search_tsv @@ parsed.tsq
  order by rank desc
  limit greatest(coalesce(lim, 10), 1);
$$;

grant execute on function public.search_pillars_fts(text, int) to anon, authenticated, service_role;
