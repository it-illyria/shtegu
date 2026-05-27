create table if not exists trail_conditions (
  id            uuid primary key default gen_random_uuid(),
  trail_slug    text not null,
  reporter_id   uuid references auth.users(id) on delete set null,
  reporter_name text not null default 'Anonymous' check (char_length(reporter_name) <= 60),
  condition     text not null check (condition in ('good', 'muddy', 'overgrown', 'closed')),
  notes         text check (char_length(notes) <= 500),
  reported_at   timestamptz not null default now()
);
create index on trail_conditions(trail_slug, reported_at desc);
alter table trail_conditions enable row level security;
-- anyone can read
create policy "public read conditions" on trail_conditions for select using (true);
-- authenticated (including anon) can insert
create policy "insert condition" on trail_conditions for insert with check (true);
