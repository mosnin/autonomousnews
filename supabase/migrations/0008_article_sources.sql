-- Techno Times — phase 8: structured per-article source citations.
--
-- Today the article has a flat `source_urls text[]` column. That tells us
-- WHERE the article was reported from, but readers see only bare hostnames
-- in the Sources block. The new writer pipeline (cluster-of-sources +
-- "REPORTER not creative writer" prompt) produces a richer citation list:
-- the title, publication name, and URL of every source the writer
-- attributed claims to.
--
-- We store that list as jsonb so the shape stays flexible and Postgres
-- gives us a path-indexable, query-friendly column without a join table.
-- NULL is allowed for back-compat with articles produced before this
-- migration ships.

alter table public.articles
  add column if not exists sources_used jsonb;

comment on column public.articles.sources_used is
  'Array<{ title, publication, url }> of sources the writer attributed claims to. '
  'NULL for legacy articles produced before phase 8.';
