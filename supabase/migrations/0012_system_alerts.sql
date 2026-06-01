-- System-wide alert banner managed by admins.
-- The application surfaces the highest-severity active alert at the top of
-- every page. Users may dismiss it; the dismissal is stored client-side.

create table if not exists system_alerts (
  id          uuid primary key default gen_random_uuid(),
  message_en  text not null,
  message_sq  text not null,
  severity    text not null check (severity in ('info', 'warning', 'danger')),
  dismissable boolean not null default true,
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- Plain index — Postgres rejects now() in a partial index predicate (must be
-- IMMUTABLE). Active-window filtering happens in the SELECT policy below.
create index if not exists system_alerts_active_idx
  on system_alerts (starts_at desc);

alter table system_alerts enable row level security;

-- Anyone (including anonymous) may read active alerts.
drop policy if exists "public read active alerts" on system_alerts;
create policy "public read active alerts" on system_alerts
  for select using (
    starts_at <= now() and (ends_at is null or ends_at > now())
  );

-- Admin write access is gated at the application layer (email allowlist).
drop policy if exists "admin insert alerts" on system_alerts;
create policy "admin insert alerts" on system_alerts
  for insert with check (true);

drop policy if exists "admin update alerts" on system_alerts;
create policy "admin update alerts" on system_alerts
  for update using (true);

drop policy if exists "admin delete alerts" on system_alerts;
create policy "admin delete alerts" on system_alerts
  for delete using (true);
