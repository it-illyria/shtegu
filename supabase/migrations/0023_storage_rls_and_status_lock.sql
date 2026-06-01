-- 0023 — Storage RLS + status lock + photo FK & cleanup.
--
-- Addresses findings:
--   RT4-H1 — Anonymous INSERT into trail_proposals / trail_contributions can
--            set status='approved', bypassing moderator review. Both the RLS
--            WITH CHECK and a BEFORE INSERT trigger force pending for
--            non-admins.
--   RT4-H4 — storage.objects has no project-level RLS for the trail-photos
--            bucket. Add explicit SELECT/INSERT/DELETE policies.
--   RT4-H5 — Anonymous uploads to trail-photos. Restrict INSERT to
--            authenticated callers, and pin the first path segment to an
--            existing trail slug to prevent stray uploads.
--   RT4-M7 — trail_photos.trail_slug had no FK to trails(slug). Add it with
--            ON DELETE CASCADE so removing a trail cleans up its photos.
--   RT4-M8 — Deleting a trail_photos row left the storage object orphaned.
--            Add an AFTER DELETE trigger that removes the storage.objects
--            row in the trail-photos bucket.
--
-- Idempotent. Do not modify earlier migrations.
--
-- OPERATOR CAVEATS:
--   • Supabase Storage RLS lives on storage.objects. Writing policies on that
--     table from a migration requires the service_role (or a role with
--     equivalent ownership) — the standard Supabase migration runner uses
--     `postgres`, which works. If a custom runner uses the anon/authenticated
--     role this migration will fail at the storage.objects DDL.
--   • The auth.role() check is sufficient as a coarse gate, but the canonical
--     bucket-level size/MIME caps remain in the Supabase Storage UI
--     (Allowed MIME: image/*, max 5 MB) — see 0015.
--   • The owner-delete policy assumes storage.objects.owner is set to the
--     uploading user's auth.uid() (Supabase default for client uploads).
--   • Precondition for the FK: public.trails.slug must be PK or UNIQUE. This
--     is confirmed by 0005_contributions.sql which already references
--     trails(slug) as a foreign key.

-- ---------------------------------------------------------------------------
-- RT4-H1 — Status lock on community submissions.
-- ---------------------------------------------------------------------------

-- trail_proposals: re-tighten the INSERT policy to forbid non-admin
-- callers from setting status to anything other than 'pending'.
drop policy if exists "anyone can propose a trail" on public.trail_proposals;
create policy "anyone can propose a trail" on public.trail_proposals
  for insert
  with check (
    (contributor_id is null or contributor_id = auth.uid())
    and (coalesce(status, 'pending') = 'pending' or public.is_admin())
  );

-- trail_contributions: mirror the same lock.
drop policy if exists "anyone can submit contribution" on public.trail_contributions;
create policy "anyone can submit contribution" on public.trail_contributions
  for insert
  with check (
    (contributor_id is null or contributor_id = auth.uid())
    and (coalesce(status, 'pending') = 'pending' or public.is_admin())
  );

-- Defense-in-depth: BEFORE INSERT trigger normalises status to 'pending'
-- for non-admin callers, regardless of what RLS allowed through.
create or replace function public.force_pending_status() returns trigger
  language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if not public.is_admin() then
    new.status := 'pending';
  end if;
  return new;
end $$;

drop trigger if exists trail_proposals_force_pending on public.trail_proposals;
create trigger trail_proposals_force_pending
  before insert on public.trail_proposals
  for each row execute function public.force_pending_status();

drop trigger if exists trail_contributions_force_pending on public.trail_contributions;
create trigger trail_contributions_force_pending
  before insert on public.trail_contributions
  for each row execute function public.force_pending_status();

-- ---------------------------------------------------------------------------
-- RT4-H4 + RT4-H5 — storage.objects RLS for the trail-photos bucket.
-- Bucket id confirmed from scripts/setup-storage.mjs (const BUCKET).
-- ---------------------------------------------------------------------------

drop policy if exists "trail-photos public read"   on storage.objects;
drop policy if exists "trail-photos auth insert"   on storage.objects;
drop policy if exists "trail-photos owner delete"  on storage.objects;
drop policy if exists "trail-photos owner update"  on storage.objects;

create policy "trail-photos public read" on storage.objects
  for select
  using (bucket_id = 'trail-photos');

create policy "trail-photos auth insert" on storage.objects
  for insert
  with check (
    bucket_id = 'trail-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] in (select slug from public.trails)
  );

create policy "trail-photos owner delete" on storage.objects
  for delete
  using (
    bucket_id = 'trail-photos'
    and (owner = auth.uid() or public.is_admin())
  );

-- No UPDATE policy on trail-photos objects — uploads are immutable.

-- ---------------------------------------------------------------------------
-- RT4-M7 — Add the missing FK on trail_photos.trail_slug.
-- ---------------------------------------------------------------------------

do $$ begin
  alter table public.trail_photos
    add constraint trail_photos_trail_slug_fk
    foreign key (trail_slug) references public.trails(slug) on delete cascade;
exception
  when duplicate_object then null;
  when duplicate_table  then null;
end $$;

-- ---------------------------------------------------------------------------
-- RT4-M8 — Storage cleanup on trail_photos deletion.
-- Supabase does not auto-cascade DB row deletes into storage.objects; do it
-- explicitly so we don't leak orphaned files (or pay for their storage).
-- ---------------------------------------------------------------------------

create or replace function public.cleanup_trail_photo_object() returns trigger
  language plpgsql security definer set search_path = public, storage, pg_catalog as $$
begin
  delete from storage.objects
    where bucket_id = 'trail-photos'
      and name = old.storage_path;
  return old;
end $$;

drop trigger if exists trail_photos_storage_cleanup on public.trail_photos;
create trigger trail_photos_storage_cleanup
  after delete on public.trail_photos
  for each row execute function public.cleanup_trail_photo_object();
