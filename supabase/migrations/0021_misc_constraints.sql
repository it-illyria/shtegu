-- Miscellaneous integrity constraints.
-- Ensures system_alerts always has a valid time window: if ends_at is set,
-- it must be strictly after starts_at. Open-ended (NULL ends_at) is allowed.

do $$ begin
  alter table public.system_alerts
    add constraint system_alerts_window_chk
    check (ends_at is null or ends_at > starts_at);
exception when duplicate_object then null; end $$;
