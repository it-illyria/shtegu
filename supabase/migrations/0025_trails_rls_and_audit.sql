-- 0025 — Trails RLS, view security_invoker, photo DELETE policy, admin audit.
--
-- Addresses findings:
--   RT5-C1 — public.trails had RLS disabled. Any anon/authenticated caller
--            could UPDATE arbitrary columns (e.g. cover_image_url). Enable RLS
--            with a public read policy and admin-only write policies.
--   RT5-H3 — public.trail_covers (from 0013_trail_cover.sql) runs as the view
--            owner (postgres → bypasses RLS). Flip to security_invoker so the
--            caller's RLS on trails / trail_photos applies.
--   RT5-H4 — public.trail_photos had no DELETE policy, so the AFTER DELETE
--            trigger trail_photos_storage_cleanup (RT4-M8, 0023) could never
--            fire. Add an owner-or-admin DELETE policy.
--   RT5-H5 — No forensic record of moderation activity. Add an admin_audit
--            table + AFTER trigger on trail_proposals, trail_contributions,
--            system_alerts, and trails.
--
-- Idempotent. Do not modify earlier migrations.
--
-- CAVEATS / DESIGN NOTES:
--   • The SECURITY DEFINER functions apply_trail_proposal and
--     apply_trail_contribution (see 0013_security_hardening.sql, 0019) write
--     to public.trails as their legitimate, audited path. They run as
--     postgres, so they bypass the new trails RLS policies by design.
--     This is intentional: it preserves the moderator-approval pipeline.
--   • The storage policy "trail-photos auth insert" (0023) does
--     `(storage.foldername(name))[1] in (select slug from public.trails)`.
--     The new "trails public read" policy below grants anon SELECT, so this
--     subquery continues to work for unauthenticated path validation.
--   • The audit trigger on public.trails fires for EVERY row change, including
--     SECURITY DEFINER writes by apply_trail_proposal/apply_trail_contribution.
--     This is desired — admin approvals appear in admin_audit too, attributed
--     to whichever actor's auth context the trigger runs in (the approving
--     admin, since the apply_* functions are invoked by their UPDATE on the
--     moderation table).
--   • Audit is intentionally NOT attached to high-volume tables (reviews,
--     trail_conditions, trail_photos). Those have their own rate guards and
--     would generate prohibitive audit volume.

-- ---------------------------------------------------------------------------
-- RT5-C1 — Enable RLS on public.trails with public read + admin-only writes.
-- ---------------------------------------------------------------------------

alter table public.trails enable row level security;

drop policy if exists "trails public read" on public.trails;
create policy "trails public read" on public.trails
  for select using (true);

drop policy if exists "trails admin insert" on public.trails;
create policy "trails admin insert" on public.trails
  for insert with check (public.is_admin());

drop policy if exists "trails admin update" on public.trails;
create policy "trails admin update" on public.trails
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "trails admin delete" on public.trails;
create policy "trails admin delete" on public.trails
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- RT5-H3 — Flip trail_covers view to security_invoker so caller RLS applies.
-- Wrapped in a DO block so this migration succeeds even when the view
-- hasn't been created yet (trail_covers lives in 0028_trail_cover.sql,
-- which numerically comes AFTER 0025 because of the 0013 prefix-collision
-- rename). 0031_trail_photo_cover_flag.sql rebuilds the view explicitly
-- with `with (security_invoker = true)` — so by the time the full chain
-- is applied, the view is invoker-secure regardless of this step.
-- ---------------------------------------------------------------------------

do $$ begin
  if to_regclass('public.trail_covers') is not null then
    execute 'alter view public.trail_covers set (security_invoker = true)';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- RT5-H4 — Missing DELETE policy on trail_photos (unblocks RT4-M8 trigger).
-- ---------------------------------------------------------------------------

drop policy if exists "trail_photos owner or admin delete" on public.trail_photos;
create policy "trail_photos owner or admin delete" on public.trail_photos
  for delete using (uploader_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- RT5-H5 — admin_audit table + AFTER triggers on moderation tables.
-- ---------------------------------------------------------------------------

create table if not exists public.admin_audit (
  id           bigserial primary key,
  actor_id     uuid references auth.users(id) on delete set null,
  actor_email  text,
  action       text not null,            -- 'INSERT' | 'UPDATE' | 'DELETE'
  target_table text not null,
  target_id    text not null,            -- text since some PKs are uuid, some slug
  before_row   jsonb,
  after_row    jsonb,
  occurred_at  timestamptz default now()
);

create index if not exists admin_audit_target_idx
  on public.admin_audit(target_table, target_id, occurred_at desc);

alter table public.admin_audit enable row level security;

drop policy if exists "admin_audit admin read" on public.admin_audit;
create policy "admin_audit admin read" on public.admin_audit
  for select using (public.is_admin());

-- No INSERT/UPDATE/DELETE policies — only the SECURITY DEFINER trigger writes.

create or replace function public.write_admin_audit() returns trigger
  language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  v_actor uuid := auth.uid();
  v_email text;
  v_id    text;
begin
  begin
    v_email := auth.jwt() ->> 'email';
  exception when others then
    v_email := null;
  end;

  if tg_op = 'INSERT' then
    v_id := coalesce(new.id::text, '');
  elsif tg_op = 'DELETE' then
    v_id := coalesce(old.id::text, '');
  else
    v_id := coalesce(new.id::text, '');
  end if;

  insert into public.admin_audit(
    actor_id, actor_email, action, target_table, target_id, before_row, after_row
  ) values (
    v_actor,
    v_email,
    tg_op,
    tg_table_name,
    v_id,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end $$;

alter function public.write_admin_audit() owner to postgres;
revoke all on function public.write_admin_audit() from public;

-- Attach to moderation tables + trails itself.
drop trigger if exists trail_proposals_audit on public.trail_proposals;
create trigger trail_proposals_audit
  after insert or update or delete on public.trail_proposals
  for each row execute function public.write_admin_audit();

drop trigger if exists trail_contributions_audit on public.trail_contributions;
create trigger trail_contributions_audit
  after insert or update or delete on public.trail_contributions
  for each row execute function public.write_admin_audit();

drop trigger if exists system_alerts_audit on public.system_alerts;
create trigger system_alerts_audit
  after insert or update or delete on public.system_alerts
  for each row execute function public.write_admin_audit();

drop trigger if exists trails_audit on public.trails;
create trigger trails_audit
  after insert or update or delete on public.trails
  for each row execute function public.write_admin_audit();
