-- Originally applied as 0013_trail_cover.sql; renamed to avoid prefix collision
-- with 0013_security_hardening.sql. Live Supabase projects that already ran
-- the 0013-prefixed version will see this as a "new" migration — make sure
-- the operator manually marks it as applied in supabase_migrations.schema_migrations
-- (or the equivalent journal) to avoid double-execution.

-- Hand-picked cover image per trail. Optional — when null, the application
-- falls back to the most recent community photo from trail_photos, and
-- finally to the difficulty gradient.

alter table trails
  add column if not exists cover_image_url text;

-- View: each trail with a resolved cover (explicit url > newest community photo).
-- Storage paths in trail_photos are bucket-relative; the app constructs the full
-- public URL via supabase.storage.getPublicUrl on the client/server.
create or replace view trail_covers as
  select
    t.slug,
    coalesce(
      t.cover_image_url,
      (
        select tp.storage_path
        from trail_photos tp
        where tp.trail_slug = t.slug
        order by tp.created_at desc
        limit 1
      )
    ) as cover_path,
    case
      when t.cover_image_url is not null then 'explicit'
      else 'community'
    end as cover_source
  from trails t;

-- Public read of the view (mirrors trails / trail_photos read policies).
grant select on trail_covers to anon, authenticated;
