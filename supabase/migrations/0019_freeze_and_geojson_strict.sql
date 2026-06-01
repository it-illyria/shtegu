-- 0019 — Freeze approved rows + strict per-coordinate GeoJSON validation.
--
-- Addresses findings:
--   RT3-H3 — Apply triggers re-fire when toggling approved→rejected→approved.
--            Tighten the guard to only fire on pending→approved, and add a
--            BEFORE UPDATE freeze trigger that makes approved rows immutable.
--   RT3-H4 — proposals_rate_guard only validates the LineString shell, not
--            individual coordinates. Add per-coordinate type, arity, and
--            bbox checks.
--
-- All function bodies are redefined with CREATE OR REPLACE so existing
-- triggers (created in 0006/0005/0017) continue to bind to the new bodies.
-- Idempotent.

-- ---------------------------------------------------------------------------
-- RT3-H3 (a): tighten apply_trail_proposal guard to pending→approved.
-- Body preserved verbatim from 0017; only the transition guard changes.
-- ---------------------------------------------------------------------------
create or replace function apply_trail_proposal()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_slug   text;
  v_coords jsonb;
  v_first  jsonb;
begin
  if pg_trigger_depth() > 1 then return new; end if;

  if new.status = 'approved' and not public.is_admin() then
    raise exception 'only admins may approve';
  end if;

  if old.status = 'pending' and new.status = 'approved'
     and new.route_geojson is not null then

    -- Slugify: lower-case, strip diacritics, spaces → hyphens
    v_slug := lower(trim(new.name));
    v_slug := regexp_replace(v_slug, '[ëÿ]',  'e', 'g');
    v_slug := regexp_replace(v_slug, '[çĉ]',  'c', 'g');
    v_slug := regexp_replace(v_slug, '[àáâãäå]', 'a', 'g');
    v_slug := regexp_replace(v_slug, '[èéêë]',   'e', 'g');
    v_slug := regexp_replace(v_slug, '[ìíîï]',   'i', 'g');
    v_slug := regexp_replace(v_slug, '[òóôõö]',  'o', 'g');
    v_slug := regexp_replace(v_slug, '[ùúûü]',   'u', 'g');
    v_slug := regexp_replace(v_slug, '[^a-z0-9 -]', '', 'g');
    v_slug := regexp_replace(v_slug, '\s+', '-', 'g');
    v_slug := regexp_replace(v_slug, '-+',  '-', 'g');
    v_slug := trim(both '-' from v_slug);

    if exists (select 1 from trails where slug = v_slug) then
      v_slug := v_slug || '-' || substr(new.id::text, 1, 8);
    end if;

    v_coords := new.route_geojson -> 'coordinates';
    v_first  := v_coords -> 0;

    insert into trails (
      slug, name, name_sq, region, summary, difficulty,
      distance_km, ascent_m, duration_h, best_months,
      logistics, route_geojson, trailhead_geojson, source
    ) values (
      v_slug,
      new.name,
      new.name_sq,
      new.region,
      coalesce(new.summary, ''),
      new.difficulty,
      coalesce(new.distance_km, 0),
      coalesce(new.ascent_m,    0),
      coalesce(new.duration_h,  0),
      coalesce(new.best_months, ''),
      coalesce(new.logistics, '{}'),
      new.route_geojson,
      jsonb_build_object('type', 'Point', 'coordinates', v_first),
      'Community contribution'
    )
    on conflict (slug) do nothing;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- RT3-H3 (b): tighten apply_trail_contribution guard to pending→approved.
-- Body preserved verbatim from 0017; only the transition guard changes.
-- ---------------------------------------------------------------------------
create or replace function apply_trail_contribution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if pg_trigger_depth() > 1 then return new; end if;

  if new.status = 'approved' and not public.is_admin() then
    raise exception 'only admins may approve';
  end if;

  if old.status = 'pending' and new.status = 'approved' then
    update trails set
      name          = coalesce(new.name,          name),
      name_sq       = coalesce(new.name_sq,       name_sq),
      region        = coalesce(new.region,        region),
      summary       = coalesce(new.summary,       summary),
      difficulty    = coalesce(new.difficulty,    difficulty),
      distance_km   = coalesce(new.distance_km,   distance_km),
      ascent_m      = coalesce(new.ascent_m,      ascent_m),
      duration_h    = coalesce(new.duration_h,    duration_h),
      best_months   = coalesce(new.best_months,   best_months),
      logistics     = coalesce(new.logistics,     logistics),
      route_geojson = coalesce(new.route_geojson, route_geojson)
    where slug = new.trail_slug;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- RT3-H3 (c): freeze trigger on trail_proposals — approved rows are immutable.
-- Blocks ALL mutations once status = 'approved', including status changes
-- back to pending/rejected. Substantive columns enumerated from 0006.
-- ---------------------------------------------------------------------------
create or replace function public.freeze_approved_proposal() returns trigger
  language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if old.status = 'approved' and (
     new.status         is distinct from old.status
     or new.contributor_id   is distinct from old.contributor_id
     or new.contributor_name is distinct from old.contributor_name
     or new.notes       is distinct from old.notes
     or new.name        is distinct from old.name
     or new.region      is distinct from old.region
     or new.difficulty  is distinct from old.difficulty
     or new.name_sq     is distinct from old.name_sq
     or new.summary     is distinct from old.summary
     or new.distance_km is distinct from old.distance_km
     or new.ascent_m    is distinct from old.ascent_m
     or new.duration_h  is distinct from old.duration_h
     or new.best_months is distinct from old.best_months
     or new.logistics   is distinct from old.logistics
     or new.route_geojson is distinct from old.route_geojson
  ) then
    raise exception 'proposal % is approved and immutable', old.id using errcode = '23514';
  end if;
  return new;
end $$;

drop trigger if exists proposals_freeze_after_approval on public.trail_proposals;
create trigger proposals_freeze_after_approval
  before update on public.trail_proposals
  for each row execute function public.freeze_approved_proposal();

-- ---------------------------------------------------------------------------
-- RT3-H3 (d): freeze trigger on trail_contributions — approved rows are
-- immutable. Substantive columns enumerated from 0005_contributions.sql.
-- ---------------------------------------------------------------------------
create or replace function public.freeze_approved_contribution() returns trigger
  language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if old.status = 'approved' and (
     new.status            is distinct from old.status
     or new.trail_slug     is distinct from old.trail_slug
     or new.contributor_id   is distinct from old.contributor_id
     or new.contributor_name is distinct from old.contributor_name
     or new.message        is distinct from old.message
     or new.name           is distinct from old.name
     or new.name_sq        is distinct from old.name_sq
     or new.region         is distinct from old.region
     or new.summary        is distinct from old.summary
     or new.difficulty     is distinct from old.difficulty
     or new.distance_km    is distinct from old.distance_km
     or new.ascent_m       is distinct from old.ascent_m
     or new.duration_h     is distinct from old.duration_h
     or new.best_months    is distinct from old.best_months
     or new.logistics      is distinct from old.logistics
     or new.route_geojson  is distinct from old.route_geojson
  ) then
    raise exception 'contribution % is approved and immutable', old.id using errcode = '23514';
  end if;
  return new;
end $$;

drop trigger if exists contributions_freeze_after_approval on public.trail_contributions;
create trigger contributions_freeze_after_approval
  before update on public.trail_contributions
  for each row execute function public.freeze_approved_contribution();

-- ---------------------------------------------------------------------------
-- RT3-H4: proposals_rate_guard with per-coordinate validation.
-- Body preserved verbatim from 0017; the only addition is the per-coordinate
-- loop after the shell checks.
-- TODO(bbox-albania): tighten lng/lat further to Albania's bbox
--   (approx lng ∈ [19.2, 21.1], lat ∈ [39.6, 42.7]) once we are confident
--   no legitimate cross-border routes need to be accepted.
-- ---------------------------------------------------------------------------
create or replace function proposals_rate_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent int;
  uid    uuid := auth.uid();
begin
  -- H1-RACE: serialize concurrent inserts in this rate bucket.
  perform pg_advisory_xact_lock(
    hashtextextended(
      'proposals:auth:'||coalesce(
        uid::text,
        'anon:'||lower(coalesce(new.name, ''))
      ),
      0
    )
  );

  -- Row-level sanity: text length minimums and array cap
  if char_length(coalesce(new.name, '')) not between 2 and 120 then
    raise exception 'invalid_input: name must be 2..120 chars';
  end if;
  if char_length(coalesce(new.region, '')) not between 2 and 120 then
    raise exception 'invalid_input: region must be 2..120 chars';
  end if;
  if new.summary is not null and char_length(new.summary) > 2000 then
    raise exception 'invalid_input: summary must be <= 2000 chars';
  end if;
  if new.logistics is not null and array_length(new.logistics, 1) > 12 then
    raise exception 'invalid_input: logistics must have <= 12 items';
  end if;

  -- H4-GEOJSON: bound route_geojson shape & size, plus per-coordinate checks.
  if new.route_geojson is not null then
    if coalesce(new.route_geojson->>'type', '') <> 'LineString' then
      raise exception 'route_geojson.type must be LineString' using errcode = '22023';
    end if;
    if jsonb_array_length(new.route_geojson->'coordinates') not between 2 and 10000 then
      raise exception 'route_geojson must have 2..10000 coordinates' using errcode = '22023';
    end if;

    -- Per-coordinate validation: each entry must be [lng, lat] or
    -- [lng, lat, ele] with numeric values inside WGS84 bounds.
    declare
      n    int := jsonb_array_length(new.route_geojson->'coordinates');
      i    int;
      elem jsonb;
      lng  numeric;
      lat  numeric;
    begin
      for i in 0 .. n-1 loop
        elem := new.route_geojson->'coordinates'->i;
        if jsonb_typeof(elem) <> 'array' then
          raise exception 'coordinate % is not an array', i using errcode = '22023';
        end if;
        if jsonb_array_length(elem) not between 2 and 3 then
          raise exception 'coordinate % must have 2 or 3 elements', i using errcode = '22023';
        end if;
        if jsonb_typeof(elem->0) <> 'number' or jsonb_typeof(elem->1) <> 'number' then
          raise exception 'coordinate % must be numeric', i using errcode = '22023';
        end if;
        lng := (elem->>0)::numeric;
        lat := (elem->>1)::numeric;
        if lng not between -180 and 180 or lat not between -90 and 90 then
          raise exception 'coordinate % out of bounds', i using errcode = '22023';
        end if;
      end loop;
    end;
  end if;

  if uid is not null then
    select count(*) into recent
      from trail_proposals
      where contributor_id = uid
        and created_at > now() - interval '1 hour';
    if recent >= 3 then
      raise exception 'rate_limited: too many proposals — please try again later';
    end if;
  else
    select count(*) into recent
      from trail_proposals
      where contributor_id is null
        and lower(name) = lower(new.name)
        and created_at > now() - interval '1 hour';
    if recent >= 10 then
      raise exception 'rate_limited: too many anonymous proposals for this name';
    end if;
  end if;

  return new;
end;
$$;
