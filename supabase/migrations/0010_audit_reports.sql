-- Techno Times — phase 10: post-hoc audit reports.
--
-- The inline fact-checker (phase 9) catches fabrication at write time. It
-- cannot catch drift over time: a source that retracted, a claim that was
-- carefully phrased to pass at write time but didn't actually match its
-- source, slow link-rot, or accumulated subtle error.
--
-- The auditor is a nightly Modal cron that samples a small fraction of
-- recently-published articles, re-fetches their cited sources fresh from
-- the live web, re-runs the same fact-checker against the live text, and
-- writes one row here per audited article. The rows surface in
-- /admin/audits as an operator action queue; we never auto-unpublish.

create table if not exists public.audit_reports (
  id uuid primary key default gen_random_uuid(),
  article_id text references public.articles(id) on delete cascade,
  audited_at timestamptz not null default now(),
  audit_run_id uuid,
  -- Outcome
  claims_total int not null,
  claims_unsupported int not null,
  drift_from_source boolean not null,
  broken_source_count int not null default 0,
  recommendation text not null check (recommendation in ('keep', 'correct', 'unpublish')),
  notes text,
  -- Cost bookkeeping
  model_used text not null,
  prompt_tokens int,
  completion_tokens int,
  cost_usd numeric(10, 4)
);

create index if not exists audit_reports_article_idx
  on public.audit_reports(article_id, audited_at desc);

alter table public.audit_reports enable row level security;
-- Service role only — no public access. No policies = no public reads.
