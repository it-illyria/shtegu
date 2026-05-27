create table if not exists saved_trails (
  user_id   uuid not null references auth.users(id) on delete cascade,
  trail_slug text not null,
  saved_at  timestamptz not null default now(),
  primary key (user_id, trail_slug)
);
alter table saved_trails enable row level security;
-- users can only see/manage their own bookmarks
create policy "own bookmarks" on saved_trails
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
