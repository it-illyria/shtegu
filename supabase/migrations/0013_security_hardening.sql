-- Security hardening: fix C1 (admin RLS using(true)), C2 (unguarded SECURITY
-- DEFINER triggers), and H1 (mass-assignment via INSERT WITH CHECK).
--
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- is_admin(): hardcoded email allowlist checked against the JWT.
-- Update the array below to add or remove admins.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'email', '') = any(array[
    'juni.93.juni@gmail.com'  -- update this list as needed
  ]);
$$;

-- ---------------------------------------------------------------------------
-- C1 — Admin RLS: replace using(true) with is_admin() gates.
-- ---------------------------------------------------------------------------

-- trail_proposals
drop policy if exists "admin read proposals"   on trail_proposals;
create policy "admin read proposals" on trail_proposals
  for select using (public.is_admin());

drop policy if exists "admin update proposals" on trail_proposals;
create policy "admin update proposals" on trail_proposals
  for update using (public.is_admin()) with check (public.is_admin());

-- trail_contributions
drop policy if exists "admin read contributions"   on trail_contributions;
create policy "admin read contributions" on trail_contributions
  for select using (public.is_admin());

drop policy if exists "admin update contributions" on trail_contributions;
create policy "admin update contributions" on trail_contributions
  for update using (public.is_admin()) with check (public.is_admin());

-- system_alerts
drop policy if exists "admin insert alerts" on system_alerts;
create policy "admin insert alerts" on system_alerts
  for insert with check (public.is_admin());

drop policy if exists "admin update alerts" on system_alerts;
create policy "admin update alerts" on system_alerts
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin delete alerts" on system_alerts;
create policy "admin delete alerts" on system_alerts
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- H1 — Mass-assignment: tighten INSERT WITH CHECK clauses.
-- ---------------------------------------------------------------------------

-- trail_contributions: contributor_id must be null or match auth.uid()
drop policy if exists "anyone can submit contribution" on trail_contributions;
create policy "anyone can submit contribution" on trail_contributions
  for insert with check (
    contributor_id is null or contributor_id = auth.uid()
  );

-- trail_proposals: contributor_id must be null or match auth.uid()
drop policy if exists "anyone can propose a trail" on trail_proposals;
create policy "anyone can propose a trail" on trail_proposals
  for insert with check (
    contributor_id is null or contributor_id = auth.uid()
  );

-- trail_photos: uploader_id must match auth.uid() (already required non-null
-- via auth.uid() is not null in the old policy; now also bound to identity).
drop policy if exists "authenticated can upload" on trail_photos;
create policy "authenticated can upload" on trail_photos
  for insert with check (uploader_id = auth.uid());

-- trail_conditions: reporter_id must be null or match auth.uid()
drop policy if exists "insert condition" on trail_conditions;
create policy "insert condition" on trail_conditions
  for insert with check (
    reporter_id is null or reporter_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- C2 — Redefine SECURITY DEFINER triggers with an is_admin() guard.
-- Bodies preserved verbatim from 0005 / 0006; only the guard is added.
-- ---------------------------------------------------------------------------

create or replace function apply_trail_contribution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
