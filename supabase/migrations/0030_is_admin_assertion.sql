-- Defense-in-depth: assert is_admin() body contains the UUID-based check.
-- If a future migration accidentally downgrades it to email-based, this
-- migration fails and stops the apply chain at the right place.

do $$
declare
  v_src text;
begin
  select pg_get_functiondef((select oid from pg_proc
    where proname = 'is_admin' and pronamespace = 'public'::regnamespace
    limit 1)) into v_src;
  if v_src is null then
    raise exception 'is_admin() not defined';
  end if;
  if v_src !~* 'public\.admins' then
    raise exception 'is_admin() does not reference public.admins — possible downgrade. Aborting.';
  end if;
end $$;
