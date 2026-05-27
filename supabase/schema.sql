-- Shtegu database schema (Postgres + PostGIS).
-- Run in the Supabase SQL editor, or via `supabase db push` once you've linked a
-- project. Geometry is stored in WGS84 (SRID 4326) to match GeoJSON / MapLibre.

create extension if not exists postgis;

-- ---------------------------------------------------------------------------
-- Trails
-- ---------------------------------------------------------------------------
create table if not exists trails (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  name_sq       text,                -- Albanian name (OSM name:sq or curated); NULL = use name
  region        text not null,
  summary       text not null,
  difficulty    text not null check (difficulty in ('easy','moderate','hard','expert')),
  distance_km   numeric(6,2) not null,
  ascent_m      integer not null,
  duration_h    numeric(4,1) not null,
  best_months   text,
  logistics     text[] not null default '{}',
  source        text,  -- e.g. 'OpenStreetMap (ODbL)'
  -- GeoJSON is stored as jsonb so the JS client can read/write it directly.
  -- The PostGIS geometry columns are GENERATED from it, giving us spatial
  -- indexing + functions without the client ever touching WKT.
  route_geojson     jsonb not null,
  trailhead_geojson jsonb not null,
  route geometry(LineString, 4326)
    generated always as (st_setsrid(st_geomfromgeojson(route_geojson), 4326)) stored,
  trailhead geometry(Point, 4326)
    generated always as (st_setsrid(st_geomfromgeojson(trailhead_geojson), 4326)) stored,
  created_at    timestamptz not null default now()
);

-- Spatial index for "trails near me" / bounding-box queries.
create index if not exists trails_route_gix on trails using gist (route);
create index if not exists trails_trailhead_gix on trails using gist (trailhead);

-- ---------------------------------------------------------------------------
-- Reviews (community)
-- ---------------------------------------------------------------------------
create table if not exists reviews (
  id           uuid primary key default gen_random_uuid(),
  trail_slug   text not null references trails(slug) on delete cascade,
  author_id    uuid not null references auth.users(id) on delete cascade,
  author_name  text not null default 'Anonymous' check (char_length(author_name) <= 60),
  rating       smallint not null check (rating between 1 and 5),
  body         text not null check (char_length(body) between 1 and 4000),
  -- Server-set: true only when the author signed in with email (not anonymous).
  -- The UI shows a "guest" badge for unverified reviews so spoofed names carry
  -- less weight. Clients cannot set this (the trigger below overwrites it).
  verified     boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists reviews_trail_idx on reviews(trail_slug);

-- Abuse controls (see also: enable CAPTCHA on anonymous sign-ins in the
-- Supabase dashboard → Auth → Attack Protection).
-- 1) One review per identity per trail (stops flooding a single trail).
create unique index if not exists reviews_one_per_author_trail
  on reviews(trail_slug, author_id);

-- 2) Authoritatively set `verified` from the JWT, and rate-limit each identity
--    to 5 reviews/hour (stops cross-trail flooding from one identity).
create or replace function reviews_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare recent int;
begin
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

drop trigger if exists reviews_guard_trg on reviews;
create trigger reviews_guard_trg
  before insert on reviews
  for each row execute function reviews_guard();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table trails  enable row level security;
alter table reviews enable row level security;

-- Trails are public to read; writes are admin-only for now (no policy = denied;
-- use the service role for seeding/curation).
drop policy if exists "trails are public" on trails;
create policy "trails are public" on trails for select using (true);

-- Reviews: anyone can read; authenticated users manage their own.
drop policy if exists "reviews are public" on reviews;
create policy "reviews are public" on reviews for select using (true);

drop policy if exists "insert own review" on reviews;
create policy "insert own review" on reviews
  for insert with check (auth.uid() = author_id);

drop policy if exists "update own review" on reviews;
create policy "update own review" on reviews
  for update using (auth.uid() = author_id);

drop policy if exists "delete own review" on reviews;
create policy "delete own review" on reviews
  for delete using (auth.uid() = author_id);

-- ---------------------------------------------------------------------------
-- Feedback (complaints & suggestions)
-- ---------------------------------------------------------------------------
create table if not exists feedback (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('complaint','suggestion','other')),
  message     text not null check (char_length(message) between 1 and 4000),
  email       text check (char_length(email) <= 200),  -- optional, for replies
  trail_slug  text,                                     -- optional context
  created_at  timestamptz not null default now()
);
alter table feedback enable row level security;
-- Anyone may submit feedback; nobody may read it through the API. The operator
-- reads it via the dashboard / service role, so submissions stay private.
drop policy if exists "anyone can submit feedback" on feedback;
create policy "anyone can submit feedback" on feedback
  for insert with check (true);

-- ---------------------------------------------------------------------------
-- Example: trails within N metres of a point (lng, lat), nearest first.
-- select * from trails_nearby(19.93, 41.36, 50000);
-- ---------------------------------------------------------------------------
create or replace function trails_nearby(lng float, lat float, radius_m float)
returns setof trails
language sql stable
as $$
  select *
  from trails
  where st_dwithin(
    trailhead::geography,
    st_setsrid(st_makepoint(lng, lat), 4326)::geography,
    radius_m
  )
  order by trailhead::geography <-> st_setsrid(st_makepoint(lng, lat), 4326)::geography;
$$;
