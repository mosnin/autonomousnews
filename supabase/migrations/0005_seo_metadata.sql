-- Techno Times — phase 5: deep SEO metadata
-- Every article now ships with an explicit focus keyword, 4–5 high-intent
-- long-tail keywords, a power word used in the title, and a structured FAQ
-- block. All four power the on-page rendering AND the JSON-LD that Google
-- consumes for rich results.

alter table public.articles
  add column if not exists focus_keyword text,
  add column if not exists long_tail_keywords text[] not null default '{}',
  add column if not exists power_word text,
  add column if not exists faq jsonb;

create index if not exists articles_focus_keyword_idx
  on public.articles (focus_keyword) where focus_keyword is not null;
create index if not exists articles_long_tail_idx
  on public.articles using gin (long_tail_keywords);
