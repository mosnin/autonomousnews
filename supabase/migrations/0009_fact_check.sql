-- Phase 9 — every article carries the inline fact-check report from
-- the independent checker LLM. NULL for legacy articles.
--
-- We store only the summary (verdict, claim counts, model, cost) rather
-- than the full claim list — a long article can produce hundreds of
-- claim rows and we don't want to balloon the articles table.
alter table public.articles
  add column if not exists fact_check_report jsonb;

comment on column public.articles.fact_check_report is
  'Summary of the adversarial fact-checker pass (phase 9): { verdict, failure_reason, '
  'claims_total, claims_unsupported, model_used, cost_usd }. NULL for articles produced '
  'before phase 9 shipped.';
