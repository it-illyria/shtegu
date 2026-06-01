-- RT5-M1: prevent community photo cover takeover. Before this migration,
-- the trail_covers view fell back to the newest trail_photos row, meaning
-- any authenticated uploader could become a trail's cover image. We now
-- require an explicit moderator flag (is_cover_eligible) on each photo.

alter table public.trail_photos
  add column if not exists is_cover_eligible boolean not null default false;

-- Rebuild trail_covers view with the new filter. Mirrors 0028_trail_cover.sql
-- shape (slug, cover_path, cover_source) — the cover_source label stays the
-- same since the resolution order (explicit url > moderator-approved photo)
-- is conceptually identical from the caller's perspective.
create or replace view public.trail_covers
  with (security_invoker = true) as
select
  t.slug,
  coalesce(
    t.cover_image_url,
    (
      select tp.storage_path
      from public.trail_photos tp
      where tp.trail_slug = t.slug
        and tp.is_cover_eligible
      order by tp.created_at desc
      limit 1
    )
  ) as cover_path,
  case
    when t.cover_image_url is not null then 'explicit'
    else 'community'
  end as cover_source
from public.trails t;

grant select on public.trail_covers to anon, authenticated;
