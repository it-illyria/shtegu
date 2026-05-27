-- Trail proposals: community-submitted NEW trails pending moderator review.
-- Distinct from trail_contributions (edits to existing trails).
-- Admin approves via Supabase dashboard; trigger auto-inserts into trails
-- when a route file was provided.

create table if not exists trail_proposals (
  id               uuid primary key default gen_random_uuid(),
  contributor_id   uuid references auth.users(id) on delete set null,
  contributor_name text not null default 'Anonymous'
                     check (char_length(contributor_name) <= 60),
  status           text not null default 'pending'
                     check (status in ('pending', 'approved', 'rejected')),
  notes            text check (char_length(notes) <= 2000),
  -- Required fields
  name             text not null check (char_length(name) between 1 and 200),
  region           text not null,
  difficulty       text not null
                     check (difficulty in ('easy', 'moderate', 'hard', 'expert')),
  -- Optional fields
  name_sq          text,
  summary          text,
  distance_km      numeric(6,2),
  ascent_m         integer,
  duration_h       numeric(4,1),
  best_months      text,
  logistics        text[],
  -- GeoJSON LineString; if present, used to auto-create the trail on approval
  route_geojson    jsonb,
  created_at       timestamptz not null default now()
);

alter table trail_proposals enable row level security;

-- Anyone (including anonymous) may submit a proposal.
drop policy if exists "anyone can propose a trail" on trail_proposals;
create policy "anyone can propose a trail" on trail_proposals
  for insert with check (true);

-- ── Auto-create trail on approval ────────────────────────────────────────────
-- Fires AFTER UPDATE so we can read both old and new status. Only runs when
-- status transitions to 'approved' AND a route was supplied. If no route is
-- present the proposal is still marked approved but the admin creates the trail
-- manually (the data is all there in the proposal row).

create or replace function apply_trail_proposal()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_slug   text;
  v_coords jsonb;
  v_first  jsonb;
begin
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

drop trigger if exists apply_trail_proposal_trg on trail_proposals;
create trigger apply_trail_proposal_trg
  after update on trail_proposals
  for each row execute function apply_trail_proposal();
