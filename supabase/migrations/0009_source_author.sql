-- The sources_used jsonb now also carries an optional `author` field per
-- entry. The column itself is jsonb so we don't need a schema change at the
-- column level — we only document the new field shape for grep-discoverability.
-- This migration is a no-op SQL-wise, kept for changelog continuity.
select 1;
