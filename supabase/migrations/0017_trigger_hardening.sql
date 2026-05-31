-- 0017 — Trigger hardening: race-condition fixes, geojson bounds, timestamp
-- sanitization, XFF rightmost-IP, and anti-recursion guards.
--
-- Addresses findings:
--   H1-RACE      — TOCTOU in every *_rate_guard trigger (advisory locks)
--   H4-GEOJSON   — trail_proposals.route_geojson unbounded
--   H3-CONDITIONS— trail_conditions.reported_at backdate/forward-date
--   L2-NOTES     — trail_conditions.notes length mismatch (1000 vs 500)
--   M8-XFF       — x-forwarded-for client-controlled; use rightmost IP
--   defense-in-depth — pg_trigger_depth() guard on apply_* triggers
--
-- All function bodies are redefined with CREATE OR REPLACE so existing
-- triggers (created in 0002/0014/0015) continue to bind to the new bodies.
-- Idempotent.
--
-- CAVEAT: split_part() with a negative index requires PostgreSQL 14+. Supabase
-- has been on PG15+ since 2023, so this is safe on all supported instances.

-- ---------------------------------------------------------------------------
-- reviews_guard (per author_id)  — bucket: 'reviews:auth:'||new.author_id
-- ---------------------------------------------------------------------------
create or replace function reviews_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare recent int;
begin
  -- H1-RACE: serialize concurrent inserts in this rate bucket.
  perform pg_advisory_xact_lock(
    hashtextextended('reviews:auth:'||coalesce(new.author_id::text, ''), 0)
  );

  new.verified :=
    coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true) = false;
  select count(*) into recent
    from reviews
    where author_id = auth.uid()
      and created_at > now() - interval '1 hour';
  if recent >= 5 then
    raise exception 'rate_limited: too many reviews — please try again later';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- reviews_trail_rate_guard (per trail) — bucket: 'reviews:trail:'||new.trail_slug
-- ---------------------------------------------------------------------------
create or replace function reviews_trail_rate_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare recent int;
begin
  -- H1-RACE: serialize concurrent inserts in this rate bucket.
  perform pg_advisory_xact_lock(
    hashtextextended('reviews:trail:'||coalesce(new.trail_slug, ''), 0)
  );

  select count(*) into recent
    from reviews
    where trail_slug = new.trail_slug
      and created_at > now() - interval '1 hour';
  if recent >= 20 then
    raise exception 'rate_limited: too many reviews for this trail — please try again later';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- proposals_rate_guard
--   bucket: 'proposals:auth:'||coalesce(auth.uid()::text, 'anon:'||lower(new.name))
--   + H4-GEOJSON validation on route_geojson
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

  -- H4-GEOJSON: bound route_geojson shape & size.
  -- Optional future hardening: validate lon/lat bbox per coordinate
  -- (lon ∈ [-180,180], lat ∈ [-90,90]) — left as a TODO.
  if new.route_geojson is not null then
    if coalesce(new.route_geojson->>'type', '') <> 'LineString' then
      raise exception 'route_geojson.type must be LineString' using errcode = '22023';
    end if;
    if jsonb_array_length(new.route_geojson->'coordinates') not between 2 and 10000 then
      raise exception 'route_geojson must have 2..10000 coordinates' using errcode = '22023';
    end if;
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

-- ---------------------------------------------------------------------------
-- conditions_rate_guard
--   bucket: 'conditions:auth:'||coalesce(auth.uid()::text, 'slug:'||new.trail_slug)
--   + H3 reported_at sanitization
--   + L2 notes length aligned to 500 (matches CHECK in 0009; 1000 was dead)
-- ---------------------------------------------------------------------------
create or replace function conditions_rate_guard()
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
      'conditions:auth:'||coalesce(
        uid::text,
        'slug:'||coalesce(new.trail_slug, '')
      ),
      0
    )
  );

  -- H3-CONDITIONS: neutralize future-dated rows; reject very old ones.
  if new.reported_at is null or new.reported_at > now() + interval '1 minute' then
    new.reported_at := now();
  end if;
  if new.reported_at < now() - interval '7 days' then
    raise exception 'reported_at too old' using errcode = '22023';
  end if;

  -- L2-NOTES: column CHECK in 0009 caps notes at 500 chars; the original
  -- > 1000 check here was dead code. Aligned to 500 to match the column.
  if new.notes is not null and char_length(new.notes) > 500 then
    raise exception 'invalid_input: notes must be <= 500 chars';
  end if;

  if uid is not null then
    select count(*) into recent
      from trail_conditions
      where reporter_id = uid
        and reported_at > now() - interval '1 hour';
    if recent >= 10 then
      raise exception 'rate_limited: too many condition reports — please try again later';
    end if;
  else
    select count(*) into recent
      from trail_conditions
      where reporter_id is null
        and trail_slug = new.trail_slug
        and reported_at > now() - interval '1 hour';
    if recent >= 10 then
      raise exception 'rate_limited: too many anonymous condition reports for this trail';
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- feedback_rate_guard
--   M8-XFF: use the RIGHTMOST x-forwarded-for IP (proxy-appended real client).
--           Leftmost is client-claimed and trivially spoofable.
--   bucket: 'feedback:xff:'||<rightmost-ip>
--   CAVEAT: split_part(..., ',', -1) requires PostgreSQL 14+.
-- ---------------------------------------------------------------------------
create or replace function feedback_rate_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent    int;
  uid       uuid := auth.uid();
  xff       text;
  client_ip text;
begin
  xff := coalesce(current_setting('request.headers', true)::jsonb->>'x-forwarded-for', '');
  -- The proxy appends the real client IP at the end; the leftmost is client-claimed.
  client_ip := nullif(trim(split_part(xff, ',', -1)), '');

  -- H1-RACE: serialize concurrent inserts in this rate bucket.
  perform pg_advisory_xact_lock(
    hashtextextended('feedback:xff:'||coalesce(client_ip, ''), 0)
  );

  if uid is not null then
    -- Authenticated: soft global cap (per-uid enforcement requires a uid
    -- column we don't have on feedback). Retained from 0014.
    select count(*) into recent
      from feedback
      where created_at > now() - interval '1 hour';
    if recent >= 200 then
      raise exception 'rate_limited: feedback temporarily disabled — try again later';
    end if;
  else
    if client_ip is null then
      -- No proxy header: fall back to a conservative global cap.
      select count(*) into recent
        from feedback
        where created_at > now() - interval '1 hour';
      if recent >= 30 then
        raise exception 'rate_limited: too much anonymous feedback — try again later';
      end if;
    else
      select count(*) into recent
        from feedback
        where created_at > now() - interval '1 hour'
          and nullif(trim(split_part(
              coalesce(
                current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
                ''
              ), ',', -1)), '') = client_ip;
      if recent >= 3 then
        raise exception 'rate_limited: too many submissions from your network';
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- trail_photos_cap_per_trail — bucket: 'photos:'||new.trail_slug
-- ---------------------------------------------------------------------------
create or replace function trail_photos_cap_per_trail()
returns trigger
language plpgsql
as $$
declare
  current_count integer;
begin
  -- H1-RACE: serialize concurrent inserts in this rate bucket.
  perform pg_advisory_xact_lock(
    hashtextextended('photos:'||coalesce(new.trail_slug, ''), 0)
  );

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

-- ---------------------------------------------------------------------------
-- Anti-recursion defense-in-depth: prevent apply_* triggers from re-firing
-- if a future schema change introduces a cascading UPDATE.
-- Bodies preserved verbatim from 0013; only the depth guard is prepended.
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

  if new.status = 'approved' and old.status <> 'approved' then
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

  if new.status = 'approved' and old.status <> 'approved'
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

    -- Append short UUID suffix on collision
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
