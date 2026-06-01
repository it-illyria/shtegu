-- RT3-H2 — Harden admin bootstrap against email-confirmation squatting.
--
-- Context: 0016_admin_uuid_table.sql moved admin identity from a JWT email
-- claim to a UUID membership table (public.admins) to neutralize the
-- supabase.auth.updateUser({email}) elevation vector. However, the
-- bootstrap DO block in 0016 only checks `lower(email) = lower(...)` against
-- auth.users — it does NOT require email_confirmed_at to be set.
--
-- Vector: an attacker who signs up with the bootstrap admin email BEFORE
-- the real operator has confirmed it (i.e. "squats" the unconfirmed row)
-- would, on the next migration run, be granted admin via that match.
-- Supabase typically requires email confirmation before issuing usable
-- sessions, but the auth.users row still exists with email set and
-- email_confirmed_at null — which is exactly what a naive lookup matches.
--
-- Fix in this migration:
--   1. Re-run the bootstrap with the missing `email_confirmed_at is not null`
--      guard, and an idempotent `on conflict (user_id) do nothing`. If no
--      verified user exists yet we `raise notice` so the operator sees the
--      fail-loud message in migration output, but we do NOT raise an
--      exception — fresh databases (no users at all) must still migrate.
--   2. Provide a reusable, security-definer helper public.add_admin(email)
--      so future admin additions go through the same verified-email guard
--      from a single audited path, rather than ad-hoc INSERTs.
--
-- Do not modify 0016 — keeping this isolated makes the hardening auditable.

do $$
declare
  admin_uid uuid;
begin
  select id into admin_uid from auth.users
    where lower(email) = lower('juni.93.juni@gmail.com')
      and email_confirmed_at is not null
    limit 1;
  if admin_uid is null then
    raise notice
      'admin bootstrap: no VERIFIED auth.users row for juni.93.juni@gmail.com; '
      'run select public.add_admin(''juni.93.juni@gmail.com'') after the user '
      'signs up and confirms their email.';
  else
    insert into public.admins(user_id, email)
      values (admin_uid, 'juni.93.juni@gmail.com')
      on conflict (user_id) do nothing;
  end if;
end $$;

-- Ongoing admin-management helper. Use from psql / Supabase SQL Editor:
--   select public.add_admin('newadmin@x.com');
-- Refuses unverified emails, so it cannot be tricked by squatters.
create or replace function public.add_admin(p_email text) returns uuid
  language plpgsql security definer set search_path = public, pg_catalog as $$
declare uid uuid;
begin
  select id into uid from auth.users
    where lower(email) = lower(p_email)
      and email_confirmed_at is not null
    limit 1;
  if uid is null then
    raise exception 'no verified user with email %', p_email using errcode = 'P0002';
  end if;
  insert into public.admins(user_id, email) values (uid, p_email)
    on conflict (user_id) do nothing;
  return uid;
end $$;

revoke all on function public.add_admin(text) from public;
grant execute on function public.add_admin(text) to postgres;
