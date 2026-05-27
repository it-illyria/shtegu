create table if not exists user_activities (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  trail_slug    text not null,
  completed_at  date not null default current_date,
  duration_min  integer,   -- actual time taken
  notes         text check (char_length(notes) <= 500),
  created_at    timestamptz not null default now()
);
create index on user_activities(user_id, completed_at desc);
alter table user_activities enable row level security;
create policy "own activities" on user_activities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
