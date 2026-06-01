-- 0024 — Extend bidi/control regex, polish freeze guards, harden GeoJSON.
--
-- Addresses RT4 findings:
--   RT4-M2  — Extend bidi/control CHECK regex to cover BOM, line/paragraph
--             separators, variation selectors (BMP + Mongolian), tag chars,
--             and zero-width space/joiners. Drop old constraints, recreate
--             with NOT VALID (RT4-M11), then VALIDATE in a catch block.
--   RT4-M3  — proposals_rate_guard: add altitude type check in the
--             per-coordinate loop. Reject coords whose 3rd element is
--             present but not a number (and not null).
--   RT4-M12 — Maintenance bypass GUC `app.unfreeze`: when set to 'on' in
--             the current session/transaction, the freeze triggers become
--             no-ops. Intended use:
--               begin;
--                 set local app.unfreeze = 'on';
--                 update public.trail_proposals set ... where id = '...';
--               commit;
--             The GUC is read with current_setting(..., true) so it is
--             treated as missing (off) when never set. Because it must be
--             *explicitly* set per transaction, accidental bypass is
--             unlikely; nevertheless, do NOT grant SET privileges on this
--             GUC to anon/authenticated roles. Postgres allows any role to
--             SET a custom GUC by default, so the operator-only contract
--             relies on connection-level role separation (service_role).
--   RT4-M15 — Whole-row freeze fallback: after the per-column comparison
--             check, also compare to_jsonb(new) vs to_jsonb(old). This
--             catches future columns added to the table without updating
--             the explicit list. Excluded keys are minimal — neither table
--             has updated_at today, so no exclusions are necessary, but the
--             excluding form is used to keep the pattern obvious.
--
-- Idempotent. Re-running this migration is safe: each ALTER drops the
-- existing constraint by name first, the functions use CREATE OR REPLACE,
-- and the VALIDATE step swallows check_violation.

-- ============================================================================
-- RT4-M2 — Extended bidi/invisible-codepoint class.
--
-- New codepoints (added to the 0020 set):
--   U+FEFF                  BOM / zero-width no-break space
--   U+2028, U+2029          line/paragraph separators
--   U+FE00..U+FE0F          variation selectors (16)
--   U+180B..U+180D          Mongolian free variation selectors
--   U+E0000..U+E007F        tag characters (invisible steganography)
--   U+200B..U+200D          ZWSP, ZWNJ, ZWJ (invisible separators/joiners)
--
-- The original 0020 codepoints stay:
--   U+061C, U+200E, U+200F, U+202A..U+202E, U+2066..U+2069
--
-- Postgres regex character classes accept ranges with literal characters,
-- so we paste the codepoints directly. The tag range U+E0000..U+E007F is
-- above the BMP; psql encodes the file as UTF-8 and the regex engine
-- treats them as a range.
-- ============================================================================

-- ── reviews ─────────────────────────────────────────────────────────────────
do $$ begin
  alter table public.reviews drop constraint if exists reviews_author_name_no_bidi;
  alter table public.reviews
    add constraint reviews_author_name_no_bidi
    check (author_name !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩
‌‍‎᠋᠌᠍︀︁︂︃︄︅︆︇︈︉︊︋︌︍󠀀-󠁿]') not valid;
end $$;

do $$ begin
  alter table public.reviews drop constraint if exists reviews_body_no_bidi;
  alter table public.reviews
    add constraint reviews_body_no_bidi
    check (body !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩
‌‍‎᠋᠌᠍︀︁︂︃︄︅︆︇︈︉︊︋︌︍󠀀-󠁿]') not valid;
end $$;

-- ── trail_photos ────────────────────────────────────────────────────────────
do $$ begin
  alter table public.trail_photos drop constraint if exists trail_photos_uploader_name_no_bidi;
  alter table public.trail_photos
    add constraint trail_photos_uploader_name_no_bidi
    check (uploader_name !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩
‌‍‎᠋᠌᠍︀︁︂︃︄︅︆︇︈︉︊︋︌︍󠀀-󠁿]') not valid;
end $$;

-- ── trail_proposals ─────────────────────────────────────────────────────────
do $$ begin
  alter table public.trail_proposals drop constraint if exists trail_proposals_contributor_name_no_bidi;
  alter table public.trail_proposals
    add constraint trail_proposals_contributor_name_no_bidi
    check (contributor_name !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩
‌‍‎᠋᠌᠍︀︁︂︃︄︅︆︇︈︉︊︋︌︍󠀀-󠁿]') not valid;
end $$;

do $$ begin
  alter table public.trail_proposals drop constraint if exists trail_proposals_name_no_bidi;
  alter table public.trail_proposals
    add constraint trail_proposals_name_no_bidi
    check (name !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩
‌‍‎᠋᠌᠍︀︁︂︃︄︅︆︇︈︉︊︋︌︍󠀀-󠁿]') not valid;
end $$;

do $$ begin
  alter table public.trail_proposals drop constraint if exists trail_proposals_region_no_bidi;
  alter table public.trail_proposals
    add constraint trail_proposals_region_no_bidi
    check (region !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩
‌‍‎᠋᠌᠍︀︁︂︃︄︅︆︇︈︉︊︋︌︍󠀀-󠁿]') not valid;
end $$;

do $$ begin
  alter table public.trail_proposals drop constraint if exists trail_proposals_summary_no_bidi;
  alter table public.trail_proposals
    add constraint trail_proposals_summary_no_bidi
    check (summary is null or summary !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩
‌‍‎᠋᠌᠍︀︁︂︃︄︅︆︇︈︉︊︋︌︍󠀀-󠁿]') not valid;
end $$;

-- ── trail_contributions ─────────────────────────────────────────────────────
do $$ begin
  alter table public.trail_contributions drop constraint if exists trail_contributions_contributor_name_no_bidi;
  alter table public.trail_contributions
    add constraint trail_contributions_contributor_name_no_bidi
    check (contributor_name !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩
‌‍‎᠋᠌᠍︀︁︂︃︄︅︆︇︈︉︊︋︌︍󠀀-󠁿]') not valid;
end $$;

-- ── trail_conditions ────────────────────────────────────────────────────────
do $$ begin
  alter table public.trail_conditions drop constraint if exists trail_conditions_reporter_name_no_bidi;
  alter table public.trail_conditions
    add constraint trail_conditions_reporter_name_no_bidi
    check (reporter_name !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩
‌‍‎᠋᠌᠍︀︁︂︃︄︅︆︇︈︉︊︋︌︍󠀀-󠁿]') not valid;
end $$;

do $$ begin
  alter table public.trail_conditions drop constraint if exists trail_conditions_notes_no_bidi;
  alter table public.trail_conditions
    add constraint trail_conditions_notes_no_bidi
    check (notes is null or notes !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩
‌‍‎᠋᠌᠍︀︁︂︃︄︅︆︇︈︉︊︋︌︍󠀀-󠁿]') not valid;
end $$;

-- ── feedback ────────────────────────────────────────────────────────────────
do $$ begin
  alter table public.feedback drop constraint if exists feedback_message_no_bidi;
  alter table public.feedback
    add constraint feedback_message_no_bidi
    check (message !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩
‌‍‎᠋᠌᠍︀︁︂︃︄︅︆︇︈︉︊︋︌︍󠀀-󠁿]') not valid;
end $$;

-- ============================================================================
-- RT4-M3 — proposals_rate_guard: altitude type check.
--
-- Body preserved verbatim from 0019; the only addition is the altitude
-- check inside the per-coordinate loop, right after the lng/lat type
-- checks. Altitudes are permitted to be JSON null (open elevation unknown).
-- ============================================================================
create or replace function proposals_rate_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent int;
  uid    uuid := auth.uid();
begin
  perform pg_advisory_xact_lock(
    hashtextextended(
      'proposals:auth:'||coalesce(
        uid::text,
        'anon:'||lower(coalesce(new.name, ''))
      ),
      0
    )
  );

  if char_length(coalesce(new.name, '')) not between 2 and 120 then
    raise exception 'invalid_input: name must be 2..120 chars';
  end if;
  if char_length(coalesce(new.region, '')) not between 2 and 120 then
    raise exception 'invalid_input: region must be 2..120 chars';
  end if;
  if new.summary is not null and char_length(new.summary) > 2000 then
    raise exception 'invalid_input: summary must be <= 2000 chars';
  end if;
  if new.logistics is not null and array_length(new.logistics, 1) > 12 then
    raise exception 'invalid_input: logistics must have <= 12 items';
  end if;

  if new.route_geojson is not null then
    if coalesce(new.route_geojson->>'type', '') <> 'LineString' then
      raise exception 'route_geojson.type must be LineString' using errcode = '22023';
    end if;
    if jsonb_array_length(new.route_geojson->'coordinates') not between 2 and 10000 then
      raise exception 'route_geojson must have 2..10000 coordinates' using errcode = '22023';
    end if;

    declare
      n    int := jsonb_array_length(new.route_geojson->'coordinates');
      i    int;
      elem jsonb;
      lng  numeric;
      lat  numeric;
    begin
      for i in 0 .. n-1 loop
        elem := new.route_geojson->'coordinates'->i;
        if jsonb_typeof(elem) <> 'array' then
          raise exception 'coordinate % is not an array', i using errcode = '22023';
        end if;
        if jsonb_array_length(elem) not between 2 and 3 then
          raise exception 'coordinate % must have 2 or 3 elements', i using errcode = '22023';
        end if;
        if jsonb_typeof(elem->0) <> 'number' or jsonb_typeof(elem->1) <> 'number' then
          raise exception 'coordinate % must be numeric', i using errcode = '22023';
        end if;
        -- RT4-M3: altitude (3rd element) must be numeric or JSON null.
        if jsonb_array_length(elem) = 3 and jsonb_typeof(elem->2) not in ('number','null') then
          raise exception 'coordinate % altitude must be numeric or null', i using errcode = '22023';
        end if;
        lng := (elem->>0)::numeric;
        lat := (elem->>1)::numeric;
        if lng not between -180 and 180 or lat not between -90 and 90 then
          raise exception 'coordinate % out of bounds', i using errcode = '22023';
        end if;
      end loop;
    end;
  end if;

  if uid is not null then
    select count(*) into recent
      from trail_proposals
      where contributor_id = uid
        and created_at > now() - interval '1 hour';
    if recent >= 3 then
      raise exception 'rate_limited: too many proposals — please try again later';
    end if;
  else
    select count(*) into recent
      from trail_proposals
      where contributor_id is null
        and lower(name) = lower(new.name)
        and created_at > now() - interval '1 hour';
    if recent >= 10 then
      raise exception 'rate_limited: too many anonymous proposals for this name';
    end if;
  end if;

  return new;
end;
$$;

-- ============================================================================
-- RT4-M12 + RT4-M15 — Freeze trigger polish.
--
-- Adds at the top of each freeze function:
--   - `app.unfreeze = 'on'` GUC bypass (RT4-M12), for operator-driven
--     maintenance transactions. Use SET LOCAL to scope the bypass to a
--     single transaction; never SET it globally or per-role.
--
-- Adds at the bottom of the freeze check (RT4-M15):
--   - A whole-row to_jsonb comparison so any future column added to the
--     table is implicitly frozen even if this function isn't updated.
--     Neither trail_proposals nor trail_contributions has `updated_at`
--     today, so no keys are stripped; if one is added later, subtract it
--     from both sides (e.g. `(to_jsonb(new) - 'updated_at')`).
-- ============================================================================
create or replace function public.freeze_approved_proposal() returns trigger
  language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  -- RT4-M12: operator maintenance bypass. Use `set local app.unfreeze = 'on'`
  -- inside a transaction to legally mutate an approved row (e.g. takedowns,
  -- schema migrations). Never grant SET on this GUC to anon/authenticated.
  if current_setting('app.unfreeze', true) = 'on' then
    return new;
  end if;

  if old.status = 'approved' and (
     new.status         is distinct from old.status
     or new.contributor_id   is distinct from old.contributor_id
     or new.contributor_name is distinct from old.contributor_name
     or new.notes       is distinct from old.notes
     or new.name        is distinct from old.name
     or new.region      is distinct from old.region
     or new.difficulty  is distinct from old.difficulty
     or new.name_sq     is distinct from old.name_sq
     or new.summary     is distinct from old.summary
     or new.distance_km is distinct from old.distance_km
     or new.ascent_m    is distinct from old.ascent_m
     or new.duration_h  is distinct from old.duration_h
     or new.best_months is distinct from old.best_months
     or new.logistics   is distinct from old.logistics
     or new.route_geojson is distinct from old.route_geojson
  ) then
    raise exception 'proposal % is approved and immutable', old.id using errcode = '23514';
  end if;

  -- RT4-M15: whole-row fallback catches columns added in future migrations
  -- without updating the list above. trail_proposals has no updated_at, so
  -- the full row jsonb is compared as-is.
  if old.status = 'approved'
     and to_jsonb(new) is distinct from to_jsonb(old) then
    raise exception 'proposal % is approved and immutable (whole-row guard)', old.id using errcode = '23514';
  end if;

  return new;
end $$;

create or replace function public.freeze_approved_contribution() returns trigger
  language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  -- RT4-M12: operator maintenance bypass — see freeze_approved_proposal.
  if current_setting('app.unfreeze', true) = 'on' then
    return new;
  end if;

  if old.status = 'approved' and (
     new.status            is distinct from old.status
     or new.trail_slug     is distinct from old.trail_slug
     or new.contributor_id   is distinct from old.contributor_id
     or new.contributor_name is distinct from old.contributor_name
     or new.message        is distinct from old.message
     or new.name           is distinct from old.name
     or new.name_sq        is distinct from old.name_sq
     or new.region         is distinct from old.region
     or new.summary        is distinct from old.summary
     or new.difficulty     is distinct from old.difficulty
     or new.distance_km    is distinct from old.distance_km
     or new.ascent_m       is distinct from old.ascent_m
     or new.duration_h     is distinct from old.duration_h
     or new.best_months    is distinct from old.best_months
     or new.logistics      is distinct from old.logistics
     or new.route_geojson  is distinct from old.route_geojson
  ) then
    raise exception 'contribution % is approved and immutable', old.id using errcode = '23514';
  end if;

  -- RT4-M15: whole-row fallback. trail_contributions has no updated_at.
  if old.status = 'approved'
     and to_jsonb(new) is distinct from to_jsonb(old) then
    raise exception 'contribution % is approved and immutable (whole-row guard)', old.id using errcode = '23514';
  end if;

  return new;
end $$;

-- ============================================================================
-- RT4-M11 — VALIDATE the new constraints. Each VALIDATE is wrapped so
-- that a check_violation leaves the constraint NOT VALID (still enforced
-- for new writes) until tainted rows are cleaned.
-- ============================================================================
do $$ begin
  alter table public.reviews validate constraint reviews_author_name_no_bidi;
exception when check_violation then
  raise notice 'tainted rows exist in reviews.author_name; constraint stays NOT VALID until cleanup';
end $$;

do $$ begin
  alter table public.reviews validate constraint reviews_body_no_bidi;
exception when check_violation then
  raise notice 'tainted rows exist in reviews.body; constraint stays NOT VALID until cleanup';
end $$;

do $$ begin
  alter table public.trail_photos validate constraint trail_photos_uploader_name_no_bidi;
exception when check_violation then
  raise notice 'tainted rows exist in trail_photos.uploader_name; constraint stays NOT VALID until cleanup';
end $$;

do $$ begin
  alter table public.trail_proposals validate constraint trail_proposals_contributor_name_no_bidi;
exception when check_violation then
  raise notice 'tainted rows exist in trail_proposals.contributor_name; constraint stays NOT VALID until cleanup';
end $$;

do $$ begin
  alter table public.trail_proposals validate constraint trail_proposals_name_no_bidi;
exception when check_violation then
  raise notice 'tainted rows exist in trail_proposals.name; constraint stays NOT VALID until cleanup';
end $$;

do $$ begin
  alter table public.trail_proposals validate constraint trail_proposals_region_no_bidi;
exception when check_violation then
  raise notice 'tainted rows exist in trail_proposals.region; constraint stays NOT VALID until cleanup';
end $$;

do $$ begin
  alter table public.trail_proposals validate constraint trail_proposals_summary_no_bidi;
exception when check_violation then
  raise notice 'tainted rows exist in trail_proposals.summary; constraint stays NOT VALID until cleanup';
end $$;

do $$ begin
  alter table public.trail_contributions validate constraint trail_contributions_contributor_name_no_bidi;
exception when check_violation then
  raise notice 'tainted rows exist in trail_contributions.contributor_name; constraint stays NOT VALID until cleanup';
end $$;

do $$ begin
  alter table public.trail_conditions validate constraint trail_conditions_reporter_name_no_bidi;
exception when check_violation then
  raise notice 'tainted rows exist in trail_conditions.reporter_name; constraint stays NOT VALID until cleanup';
end $$;

do $$ begin
  alter table public.trail_conditions validate constraint trail_conditions_notes_no_bidi;
exception when check_violation then
  raise notice 'tainted rows exist in trail_conditions.notes; constraint stays NOT VALID until cleanup';
end $$;

do $$ begin
  alter table public.feedback validate constraint feedback_message_no_bidi;
exception when check_violation then
  raise notice 'tainted rows exist in feedback.message; constraint stays NOT VALID until cleanup';
end $$;
