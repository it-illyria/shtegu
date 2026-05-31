-- 0015 — trail_photos: defence-in-depth constraints
--
-- The client-side size cap in TrailPhotos.tsx (MAX_BYTES = 4 MB) is advisory
-- only: a determined attacker can bypass it from DevTools. The actual byte-
-- size cap is enforced in the Supabase Storage bucket settings (Storage →
-- trail-photos → Edit bucket):
--
--   • Allowed MIME types: image/*
--   • Max file size: 5 MB
--
-- THIS MIGRATION DOES NOT (and cannot) enforce byte size at the DB layer,
-- because trail_photos only stores the storage_path, not the file body. The
-- storage-bucket settings above are the canonical limit — verify them in the
-- Supabase dashboard after deploying.
--
-- What this migration *does* enforce:
--   1. storage_path must end with a known image extension (jpg/jpeg/png/webp).
--   2. At most 50 photos per trail_slug (BEFORE INSERT trigger).

-- 1) Filename extension whitelist (case-insensitive)
alter table trail_photos
  add constraint trail_photos_storage_path_ext_chk
  check (storage_path ~* '\.(jpe?g|png|webp)$');

-- 2) Per-trail row cap (50 photos / trail). Enforced as a trigger because a
-- CHECK constraint cannot reference other rows.
create or replace function trail_photos_cap_per_trail()
returns trigger
language plpgsql
as $$
declare
  current_count integer;
begin
  select count(*) into current_count
    from trail_photos
    where trail_slug = new.trail_slug;
  if current_count >= 50 then
    raise exception 'trail_photos: per-trail cap of 50 photos exceeded for slug %', new.trail_slug
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trail_photos_cap_per_trail_trg on trail_photos;
create trigger trail_photos_cap_per_trail_trg
  before insert on trail_photos
  for each row execute function trail_photos_cap_per_trail();

comment on constraint trail_photos_storage_path_ext_chk on trail_photos is
  'Restricts uploads to image extensions (jpg/jpeg/png/webp). Byte-size cap is enforced in the Supabase Storage bucket UI: Allowed MIME types: image/*; Max file size: 5 MB.';

comment on function trail_photos_cap_per_trail() is
  'Caps trail_photos at 50 rows per trail_slug. Byte-size cap is enforced in the Supabase Storage bucket UI: Allowed MIME types: image/*; Max file size: 5 MB.';
