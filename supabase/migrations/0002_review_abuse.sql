-- Migration: review abuse controls. Run this in the Supabase SQL editor on an
-- existing database (it's already folded into schema.sql for fresh installs).
-- Idempotent — safe to re-run.

-- "guest" flag, set authoritatively by the trigger below (never by the client).
alter table reviews
  add column if not exists verified boolean not null default false;

-- One review per identity per trail (stops flooding a single trail).
create unique index if not exists reviews_one_per_author_trail
  on reviews(trail_slug, author_id);

-- Set `verified` from the JWT anon claim + rate-limit each identity to
-- 5 reviews/hour (stops cross-trail flooding from a single identity).
create or replace function reviews_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare recent int;
begin
  new.verified :=
    coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true) = false;
  select count(*) into recent
    from reviews
    where author_id = auth.uid()
      and created_at > now() - interval '1 hour';
  if recent >= 5 then
    raise exception 'rate_limited: too many reviews — please try again later';
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_guard_trg on reviews;
create trigger reviews_guard_trg
  before insert on reviews
  for each row execute function reviews_guard();

-- NOTE: also enable CAPTCHA on anonymous sign-ins in the dashboard
-- (Auth → Attack Protection) to stop mass identity creation.
