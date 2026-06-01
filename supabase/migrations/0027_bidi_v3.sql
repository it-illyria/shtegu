-- 0027 — Further extend bidi/invisible-codepoint CHECK regex (v3).
--
-- Adds codepoints missed by 0020 and 0024. Mirrors 0024's structure exactly:
-- DROP existing constraint, re-ADD as NOT VALID, then VALIDATE in a
-- check_violation catch block. Apply AFTER 0024.
--
-- New codepoints layered on top of 0024's class:
--   U+FFF9..U+FFFB   interlinear annotation anchor/separator/terminator
--   U+115F, U+1160   Hangul Choseong/Jungseong Filler (invisible)
--   U+3164           Hangul Filler (invisible)
--   U+2800           Braille Pattern Blank (renders blank in most fonts)
--   U+17B4, U+17B5   Khmer inherent vowels AQ/AA (zero-width)
--
-- The original 0020 + 0024 codepoints remain in the class:
--   U+061C, U+200E, U+200F, U+202A..U+202E, U+2066..U+2069,
--   U+FEFF, U+2028, U+2029, U+FE00..U+FE0F, U+180B..U+180D,
--   U+E0000..U+E007F, U+200B..U+200D.
--
-- Idempotent: each ALTER drops the constraint by name first, VALIDATE
-- swallows check_violation so tainted rows don't block the migration.

-- ── reviews ─────────────────────────────────────────────────────────────────
do $$ begin
  alter table public.reviews drop constraint if exists reviews_author_name_no_bidi;
  alter table public.reviews
    add constraint reviews_author_name_no_bidi
    check (author_name !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩
‌‍‎᠋᠌᠍︀︁︂︃︄︅︆︇︈︉︊︋︌︍󠀀-󠁿￹￺￻ᅟᅠㅤ⠀឴឵]') not valid;
end $$;

do $$ begin
  alter table public.reviews drop constraint if exists reviews_body_no_bidi;
  alter table public.reviews
    add constraint reviews_body_no_bidi
    check (body !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩
‌‍‎᠋᠌᠍︀︁︂︃︄︅︆︇︈︉︊︋︌︍󠀀-󠁿￹￺￻ᅟᅠㅤ⠀឴឵]') not valid;
end $$;

-- ── trail_photos ────────────────────────────────────────────────────────────
do $$ begin
  alter table public.trail_photos drop constraint if exists trail_photos_uploader_name_no_bidi;
  alter table public.trail_photos
    add constraint trail_photos_uploader_name_no_bidi
    check (uploader_name !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩
‌‍‎᠋᠌᠍︀︁︂︃︄︅︆︇︈︉︊︋︌︍󠀀-󠁿￹￺￻ᅟᅠㅤ⠀឴឵]') not valid;
end $$;

-- ── trail_proposals ─────────────────────────────────────────────────────────
do $$ begin
  alter table public.trail_proposals drop constraint if exists trail_proposals_contributor_name_no_bidi;
  alter table public.trail_proposals
    add constraint trail_proposals_contributor_name_no_bidi
    check (contributor_name !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩
‌‍‎᠋᠌᠍︀︁︂︃︄︅︆︇︈︉︊︋︌︍󠀀-󠁿￹￺￻ᅟᅠㅤ⠀឴឵]') not valid;
end $$;

do $$ begin
  alter table public.trail_proposals drop constraint if exists trail_proposals_name_no_bidi;
  alter table public.trail_proposals
    add constraint trail_proposals_name_no_bidi
    check (name !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩
‌‍‎᠋᠌᠍︀︁︂︃︄︅︆︇︈︉︊︋︌︍󠀀-󠁿￹￺￻ᅟᅠㅤ⠀឴឵]') not valid;
end $$;

do $$ begin
  alter table public.trail_proposals drop constraint if exists trail_proposals_region_no_bidi;
  alter table public.trail_proposals
    add constraint trail_proposals_region_no_bidi
    check (region !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩
‌‍‎᠋᠌᠍︀︁︂︃︄︅︆︇︈︉︊︋︌︍󠀀-󠁿￹￺￻ᅟᅠㅤ⠀឴឵]') not valid;
end $$;

do $$ begin
  alter table public.trail_proposals drop constraint if exists trail_proposals_summary_no_bidi;
  alter table public.trail_proposals
    add constraint trail_proposals_summary_no_bidi
    check (summary is null or summary !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩
‌‍‎᠋᠌᠍︀︁︂︃︄︅︆︇︈︉︊︋︌︍󠀀-󠁿￹￺￻ᅟᅠㅤ⠀឴឵]') not valid;
end $$;

-- ── trail_contributions ─────────────────────────────────────────────────────
do $$ begin
  alter table public.trail_contributions drop constraint if exists trail_contributions_contributor_name_no_bidi;
  alter table public.trail_contributions
    add constraint trail_contributions_contributor_name_no_bidi
    check (contributor_name !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩
‌‍‎᠋᠌᠍︀︁︂︃︄︅︆︇︈︉︊︋︌︍󠀀-󠁿￹￺￻ᅟᅠㅤ⠀឴឵]') not valid;
end $$;

-- ── trail_conditions ────────────────────────────────────────────────────────
do $$ begin
  alter table public.trail_conditions drop constraint if exists trail_conditions_reporter_name_no_bidi;
  alter table public.trail_conditions
    add constraint trail_conditions_reporter_name_no_bidi
    check (reporter_name !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩
‌‍‎᠋᠌᠍︀︁︂︃︄︅︆︇︈︉︊︋︌︍󠀀-󠁿￹￺￻ᅟᅠㅤ⠀឴឵]') not valid;
end $$;

do $$ begin
  alter table public.trail_conditions drop constraint if exists trail_conditions_notes_no_bidi;
  alter table public.trail_conditions
    add constraint trail_conditions_notes_no_bidi
    check (notes is null or notes !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩
‌‍‎᠋᠌᠍︀︁︂︃︄︅︆︇︈︉︊︋︌︍󠀀-󠁿￹￺￻ᅟᅠㅤ⠀឴឵]') not valid;
end $$;

-- ── feedback ────────────────────────────────────────────────────────────────
do $$ begin
  alter table public.feedback drop constraint if exists feedback_message_no_bidi;
  alter table public.feedback
    add constraint feedback_message_no_bidi
    check (message !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩
‌‍‎᠋᠌᠍︀︁︂︃︄︅︆︇︈︉︊︋︌︍󠀀-󠁿￹￺￻ᅟᅠㅤ⠀឴឵]') not valid;
end $$;

-- ============================================================================
-- VALIDATE the recreated constraints. Wrapped so check_violation leaves the
-- constraint NOT VALID (still enforced for new writes) until cleanup.
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
