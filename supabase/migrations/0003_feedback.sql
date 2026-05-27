-- Migration: feedback (complaints & suggestions). Run in the Supabase SQL
-- editor on an existing database. Idempotent — safe to re-run.

create table if not exists feedback (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('complaint','suggestion','other')),
  message     text not null check (char_length(message) between 1 and 4000),
  email       text check (char_length(email) <= 200),  -- optional, for replies
  trail_slug  text,                                     -- optional context
  created_at  timestamptz not null default now()
);

alter table feedback enable row level security;

-- Anyone may submit; nobody may read via the API (operator reads via dashboard /
-- service role). No SELECT policy = reads denied, so submissions stay private.
drop policy if exists "anyone can submit feedback" on feedback;
create policy "anyone can submit feedback" on feedback
  for insert with check (true);
