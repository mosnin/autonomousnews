-- Techno Times — phase 3: persistent image storage
-- DALL·E URLs expire ~1 hour after generation; news-API thumbnails are
-- frequently rotated or deleted by publishers. To keep articles intact,
-- the agent pipeline pushes every cover image through Supabase Storage
-- via /api/agent/images, which writes into the public `article-images`
-- bucket below.

-- Create the bucket if it does not exist yet. Public so the CDN can
-- serve images without signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'article-images',
  'article-images',
  true,
  10 * 1024 * 1024,                       -- 10 MB cap per image
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Read policy: everyone can GET an article image.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Public can read article images'
  ) then
    create policy "Public can read article images"
      on storage.objects for select
      using (bucket_id = 'article-images');
  end if;
end $$;

-- Write policy: service role only (the Next.js /api/agent/images route
-- uses the service-role client, which bypasses RLS — this policy just
-- documents the intent for anyone reading the schema).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Service role can write article images'
  ) then
    create policy "Service role can write article images"
      on storage.objects for insert
      with check (bucket_id = 'article-images' and auth.role() = 'service_role');
  end if;
end $$;
