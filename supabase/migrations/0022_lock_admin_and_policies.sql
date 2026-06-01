-- RT4-C3 + RT4-H6 + RT4-M13 + RT4-M14 — Lock down admin identity, admin RLS,
-- and the add_admin() helper against accidental replay/downgrade.
--
-- Why this migration exists:
--   * 0013_security_hardening.sql defined is_admin() using auth.jwt() -> email,
--     which was superseded by the UUID-based body in 0016_admin_uuid_table.sql.
--     If 0013 is ever replayed (manual re-run, partial restore, drift fix), it
--     silently overwrites is_admin() with the email-based version and reopens
--     the supabase.auth.updateUser({email}) elevation vector.
--   * 0010_admin_rls.sql defined admin policies on trail_proposals /
--     trail_contributions with `using(true)`. 0013 tightened these to
--     `using(public.is_admin())`. If 0010 is replayed it reopens C1.
--   * 0018_admin_bootstrap_hardening.sql granted add_admin() to postgres only,
--     leaving service_role (the role used by server-side API routes) without
--     execute permission. RT4-M14 fixes that here.
--
-- This migration RE-ASSERTS the hardened state. It must remain the highest-
-- numbered migration that touches is_admin() / admin policies / add_admin(),
-- so that running migrations in order always lands on the secure definitions.
--
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- 0. Sanity probe — fail fast if public.admins is missing.
--    Any of 0016/0017/0018/0019/0020/0021 having run while admins doesn't
--    exist indicates broken migration ordering; abort before we lock policies
--    against a non-existent table.
-- ---------------------------------------------------------------------------
do $$ begin
  if to_regclass('public.admins') is null then
    raise exception 'public.admins missing — apply 0016 before 0022';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1. Re-assert UUID-based is_admin() (mirrors 0016 verbatim).
--    Replaying 0013 would overwrite this with the email-based body; replaying
--    0022 (which should always be the last migration touching is_admin)
--    overwrites it back to the safe UUID-based body.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public, pg_catalog as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
alter function public.is_admin() owner to postgres;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

-- ---------------------------------------------------------------------------
-- 2. Re-assert hardened admin RLS policies (mirrors 0013).
--    Drop & recreate so a replay of 0010 (using(true)) is neutralised on the
--    next run of 0022.
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
-- 3. RT4-M14 — Grant add_admin() to service_role.
--    0018 only granted execute to postgres, so server-side code using the
--    service_role key got "permission denied for function add_admin". The
--    function still refuses unverified emails internally, so granting execute
--    does NOT widen the trust boundary — it only allows the operator's backend
--    to use the single audited admin-add path.
-- ---------------------------------------------------------------------------
grant execute on function public.add_admin(text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Version-guard manifest.
--
-- The following functions/triggers were hardened in 0013–0021 and MUST NOT
-- be downgraded by replaying an earlier migration. If you ever see a diff
-- reverting any of these to a pre-hardening body, treat it as a security
-- regression and re-run 0022 (and any later patch migrations) to lock the
-- correct definitions back in:
--
--   * reviews_guard                       (0002, hardened search_path)
--   * reviews_trail_rate_guard            (0014 — per-trail rate cap)
--   * proposals_rate_guard                (0014 — proposal flood cap)
--   * conditions_rate_guard               (0014 — condition flood cap)
--   * feedback_rate_guard                 (0014 — feedback flood cap)
--   * trail_photos_cap_per_trail          (0015 — per-trail photo cap)
--   * apply_trail_proposal                (0013/0017 — is_admin gate + freeze)
--   * apply_trail_contribution            (0013/0017 — is_admin gate + freeze)
--   * freeze_approved_proposal            (0019 — immutability after approve)
--   * freeze_approved_contribution        (0019 — immutability after approve)
--
-- Replay risk: applying 0010, 0013 (the email-based is_admin body), or any
-- pre-0017 version of the apply_* triggers will silently weaken the database.
-- Operator policy: always run migrations through their highest number; never
-- cherry-pick a single old migration in isolation.
