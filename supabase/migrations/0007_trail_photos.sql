-- Trail community photos
-- Before running this migration, create a storage bucket named "trail-photos" in the
-- Supabase dashboard (Storage → New bucket):
--   • Name: trail-photos
--   • Public bucket: YES  (enables unauthenticated reads via getPublicUrl)
--   • Allowed MIME types: image/*
-- Then add the following bucket policies in the dashboard (or via the SQL editor):
--   • SELECT (download): allow all (no restriction)
--   • INSERT (upload):   allow authenticated users  [auth.role() = 'authenticated']

create table if not exists trail_photos (
  id            uuid        primary key default gen_random_uuid(),
  trail_slug    text        not null,
  uploader_id   uuid        references auth.users(id) on delete set null,
  uploader_name text        not null default 'Anonymous',
  storage_path  text        not null,
  caption       text,
  created_at    timestamptz default now()
);

alter table trail_photos enable row level security;

create policy "anyone can view photos"
  on trail_photos for select
  using (true);

create policy "authenticated can upload"
  on trail_photos for insert
  with check (auth.uid() is not null);
