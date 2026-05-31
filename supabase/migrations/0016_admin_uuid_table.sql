-- C2-NEW — Fix is_admin() bypass via supabase.auth.updateUser({email})
--
-- Vector: The previous is_admin() (0013) trusted auth.jwt() ->> 'email'.
-- Any authenticated user can call supabase.auth.updateUser({email: 'admin@...'})
-- and, after refresh, hold a JWT whose 'email' claim matches an admin allowlist
-- — instantly elevating themselves. (Supabase requires email confirmation by
-- default, but misconfigured projects / disabled confirmations leave this open.)
--
-- Fix: bind admin identity to auth.uid() (a stable UUID the user cannot
-- self-assign) by storing admins in a dedicated table and checking membership.
--
-- M3-DRIFT — Single source of truth: src/app/admin/page.tsx and is_admin() now
-- both read from public.admins instead of duplicated email allowlists.
--
-- How to add a new admin (run as service_role / via SQL editor):
--   insert into public.admins(user_id, email)
--     select id, email from auth.users where email = 'newadmin@x.com';
--
-- Idempotent: safe to re-run.

-- ── public.admins table ──
-- A row per admin user (UUIDs cannot be self-assigned, unlike emails).
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email   text not null,        -- for human-readable audit/listing
  added_at timestamptz default now()
);

-- Bootstrap the first admin. Reads the current admin email from 0013
-- (juni.93.juni@gmail.com) and inserts their row via a lookup against
-- auth.users. Wrapped in a DO block so re-running is idempotent and
-- the migration still succeeds if the user hasn't signed up yet
-- (in which case the admin must be inserted manually later).
do $$
declare
  admin_uid uuid;
begin
  select id into admin_uid from auth.users
    where lower(email) = lower('juni.93.juni@gmail.com')
    limit 1;
  if admin_uid is not null then
    insert into public.admins(user_id, email)
      values (admin_uid, 'juni.93.juni@gmail.com')
      on conflict (user_id) do nothing;
  end if;
end $$;

-- RLS on admins: read your own row only; only existing admins can add.
alter table public.admins enable row level security;

drop policy if exists "self read admin row" on public.admins;
create policy "self read admin row" on public.admins for select
  using (auth.uid() = user_id);

drop policy if exists "admins manage admins" on public.admins;
create policy "admins manage admins" on public.admins for all
  using (exists (select 1 from public.admins where user_id = auth.uid()))
  with check (exists (select 1 from public.admins where user_id = auth.uid()));

-- ── Replace is_admin() to check UUID ──
create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public, pg_catalog as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

alter function public.is_admin() owner to postgres;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;
