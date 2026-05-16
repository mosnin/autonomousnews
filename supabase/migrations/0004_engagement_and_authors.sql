-- Techno Times — phase 4: engagement, taxonomy depth, author profiles
-- Brings the site closer to a real newsroom: view counts, reactions,
-- newsletter capture, per-article update timelines, author portraits.

-- 1) is_live on articles ---------------------------------------------------
alter table public.articles
  add column if not exists is_live boolean not null default false;
create index if not exists articles_live_idx
  on public.articles (is_live, published_at desc) where is_live = true;


-- 2) article_views — lightweight aggregated counters ----------------------
create table if not exists public.article_views (
  article_id uuid primary key references public.articles(id) on delete cascade,
  views_total bigint not null default 0,
  views_24h bigint not null default 0,
  window_start timestamptz not null default now(),
  last_view_at timestamptz not null default now()
);

create or replace function public.record_article_view(p_article_id uuid)
returns void language plpgsql security definer as $$
begin
  insert into public.article_views (article_id, views_total, views_24h, window_start, last_view_at)
  values (p_article_id, 1, 1, now(), now())
  on conflict (article_id) do update set
    views_total = public.article_views.views_total + 1,
    views_24h = case
      when public.article_views.window_start > now() - interval '24 hours'
        then public.article_views.views_24h + 1
      else 1
    end,
    window_start = case
      when public.article_views.window_start > now() - interval '24 hours'
        then public.article_views.window_start
      else now()
    end,
    last_view_at = now();
end;
$$;

create index if not exists article_views_24h_idx
  on public.article_views (views_24h desc, last_view_at desc);


-- 3) article_reactions — aggregated thumbs counts -------------------------
create table if not exists public.article_reactions (
  article_id uuid primary key references public.articles(id) on delete cascade,
  thumbs_up bigint not null default 0,
  thumbs_down bigint not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function public.record_article_reaction(p_article_id uuid, p_value text)
returns void language plpgsql security definer as $$
begin
  insert into public.article_reactions (article_id) values (p_article_id)
  on conflict do nothing;
  if p_value = 'up' then
    update public.article_reactions
      set thumbs_up = thumbs_up + 1, updated_at = now()
      where article_id = p_article_id;
  elsif p_value = 'down' then
    update public.article_reactions
      set thumbs_down = thumbs_down + 1, updated_at = now()
      where article_id = p_article_id;
  end if;
end;
$$;


-- 4) newsletter_subscribers — passive email capture -----------------------
create table if not exists public.newsletter_subscribers (
  email text primary key,
  source text,                                 -- 'home-footer' | 'article-inline' | ...
  confirmed boolean not null default false,
  unsubscribed boolean not null default false,
  created_at timestamptz not null default now()
);


-- 5) story_updates — timeline of revisions for living articles -----------
create table if not exists public.story_updates (
  id bigserial primary key,
  article_id uuid not null references public.articles(id) on delete cascade,
  summary text not null,
  run_id uuid references public.agent_runs(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists story_updates_article_idx
  on public.story_updates (article_id, created_at desc);


-- 6) author_profiles — portrait + social links + start date --------------
create table if not exists public.author_profiles (
  slug text primary key,
  portrait_url text,
  joined_at date,
  link_x text,
  link_linkedin text,
  link_mastodon text,
  link_web text,
  updated_at timestamptz not null default now()
);


-- 7) RLS -----------------------------------------------------------------
alter table public.article_views enable row level security;
alter table public.article_reactions enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.story_updates enable row level security;
alter table public.author_profiles enable row level security;

drop policy if exists "Public can read view counts" on public.article_views;
create policy "Public can read view counts"
  on public.article_views for select using (true);

drop policy if exists "Public can read reactions" on public.article_reactions;
create policy "Public can read reactions"
  on public.article_reactions for select using (true);

drop policy if exists "Public can read story updates" on public.story_updates;
create policy "Public can read story updates"
  on public.story_updates for select using (true);

drop policy if exists "Public can read author profiles" on public.author_profiles;
create policy "Public can read author profiles"
  on public.author_profiles for select using (true);
-- newsletter_subscribers — no public select policy; service-role only.


-- 8) Most-read view (used by the sidebar) --------------------------------
create or replace view public.most_read_articles as
select
  a.id, a.slug, a.title, a.dek, a.excerpt,
  a.cover_image_url, a.cover_image_alt,
  a.category_slug, a.subcategory_slug,
  a.author_name, a.author_slug,
  a.is_breaking, a.is_featured, a.is_live,
  a.published_at, a.read_minutes,
  coalesce(v.views_24h, 0) as views_24h
from public.articles a
left join public.article_views v on v.article_id = a.id
where a.status = 'published'
order by coalesce(v.views_24h, 0) desc, a.published_at desc;
