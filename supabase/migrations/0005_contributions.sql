-- Community trail contributions: proposed edits pending moderator review.
-- Admins approve or reject via the Supabase dashboard (or a future admin page).
-- Approving a contribution automatically patches the trails row via trigger.

create table if not exists trail_contributions (
  id               uuid primary key default gen_random_uuid(),
  trail_slug       text not null references trails(slug) on delete cascade,
  contributor_id   uuid references auth.users(id) on delete set null,
  contributor_name text not null default 'Anonymous'
                     check (char_length(contributor_name) <= 60),
  status           text not null default 'pending'
                     check (status in ('pending', 'approved', 'rejected')),
  message          text check (char_length(message) <= 2000),
  -- Proposed field changes — NULL means "leave this field unchanged".
  name             text,
  name_sq          text,
  region           text,
  summary          text,
  difficulty       text check (
                     difficulty is null or
                     difficulty in ('easy', 'moderate', 'hard', 'expert')
                   ),
  distance_km      numeric(6,2),
  ascent_m         integer,
  duration_h       numeric(4,1),
  best_months      text,
  logistics        text[],
  route_geojson    jsonb,  -- GeoJSON LineString geometry if the route is being corrected
  created_at       timestamptz not null default now()
);

create index if not exists contributions_trail_idx  on trail_contributions(trail_slug);
create index if not exists contributions_status_idx on trail_contributions(status);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table trail_contributions enable row level security;

-- Anyone (anon or authenticated) may submit a contribution.
drop policy if exists "anyone can submit contribution" on trail_contributions;
create policy "anyone can submit contribution" on trail_contributions
  for insert with check (true);

-- Signed-in contributors may read their own submissions.
drop policy if exists "contributors read own" on trail_contributions;
create policy "contributors read own" on trail_contributions
  for select using (
    contributor_id is not null and contributor_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Trigger: apply approved contributions to the trails table
-- ---------------------------------------------------------------------------
-- When an admin changes status → 'approved', non-null fields from the
-- contribution are merged into the matching trails row via COALESCE.
create or replace function apply_trail_contribution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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

drop trigger if exists trail_contribution_approved_trg on trail_contributions;
create trigger trail_contribution_approved_trg
  after update on trail_contributions
  for each row execute function apply_trail_contribution();
