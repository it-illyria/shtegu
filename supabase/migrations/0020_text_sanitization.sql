-- Migration: text sanitization — reject Unicode bidi-control codepoints and
-- C0 control bytes in user-controlled text columns. Idempotent: each
-- ALTER TABLE ... ADD CONSTRAINT is wrapped in a DO block that swallows
-- duplicate_object so re-running this migration is safe.
--
-- Bidi controls rejected:
--   U+061C  Arabic Letter Mark (ALM)
--   U+200E  Left-to-Right Mark (LRM)
--   U+200F  Right-to-Left Mark (RLM)
--   U+202A..U+202E  LRE, RLE, PDF, LRO, RLO
--   U+2066..U+2069  LRI, RLI, FSI, PDI
--
-- C0 controls rejected:
--   U+0000..U+001F EXCEPT U+0009 (\t) and U+000A (\n), plus U+007F (DEL).
--   Multi-line bodies may legitimately contain tabs and newlines.
--
-- NOTE: these CHECK constraints apply to ALL rows (no NOT VALID used). If any
-- existing row contains these codepoints, the migration will fail. If you'd
-- prefer to skip validating existing rows, add `not valid` to each constraint
-- and run `validate constraint` later — trade-off: legacy rows remain
-- non-conformant until cleaned, but new writes are still blocked.

-- ── reviews ──────────────────────────────────────────────────────────────────
do $$ begin
  alter table public.reviews
    add constraint reviews_author_name_no_bidi
    check (author_name !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩]');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.reviews
    add constraint reviews_author_name_no_c0_controls
    check (author_name !~ '[\x00-\x08\x0B-\x1F\x7F]');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.reviews
    add constraint reviews_body_no_bidi
    check (body !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩]');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.reviews
    add constraint reviews_body_no_c0_controls
    check (body !~ '[\x00-\x08\x0B-\x1F\x7F]');
exception when duplicate_object then null; end $$;

-- ── trail_photos ─────────────────────────────────────────────────────────────
do $$ begin
  alter table public.trail_photos
    add constraint trail_photos_uploader_name_no_bidi
    check (uploader_name !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩]');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.trail_photos
    add constraint trail_photos_uploader_name_no_c0_controls
    check (uploader_name !~ '[\x00-\x08\x0B-\x1F\x7F]');
exception when duplicate_object then null; end $$;

-- ── trail_proposals ──────────────────────────────────────────────────────────
do $$ begin
  alter table public.trail_proposals
    add constraint trail_proposals_contributor_name_no_bidi
    check (contributor_name !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩]');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.trail_proposals
    add constraint trail_proposals_contributor_name_no_c0_controls
    check (contributor_name !~ '[\x00-\x08\x0B-\x1F\x7F]');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.trail_proposals
    add constraint trail_proposals_name_no_bidi
    check (name !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩]');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.trail_proposals
    add constraint trail_proposals_name_no_c0_controls
    check (name !~ '[\x00-\x08\x0B-\x1F\x7F]');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.trail_proposals
    add constraint trail_proposals_region_no_bidi
    check (region !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩]');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.trail_proposals
    add constraint trail_proposals_region_no_c0_controls
    check (region !~ '[\x00-\x08\x0B-\x1F\x7F]');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.trail_proposals
    add constraint trail_proposals_summary_no_bidi
    check (summary is null or summary !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩]');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.trail_proposals
    add constraint trail_proposals_summary_no_c0_controls
    check (summary is null or summary !~ '[\x00-\x08\x0B-\x1F\x7F]');
exception when duplicate_object then null; end $$;

-- ── trail_contributions ──────────────────────────────────────────────────────
do $$ begin
  alter table public.trail_contributions
    add constraint trail_contributions_contributor_name_no_bidi
    check (contributor_name !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩]');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.trail_contributions
    add constraint trail_contributions_contributor_name_no_c0_controls
    check (contributor_name !~ '[\x00-\x08\x0B-\x1F\x7F]');
exception when duplicate_object then null; end $$;

-- ── trail_conditions ─────────────────────────────────────────────────────────
do $$ begin
  alter table public.trail_conditions
    add constraint trail_conditions_reporter_name_no_bidi
    check (reporter_name !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩]');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.trail_conditions
    add constraint trail_conditions_reporter_name_no_c0_controls
    check (reporter_name !~ '[\x00-\x08\x0B-\x1F\x7F]');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.trail_conditions
    add constraint trail_conditions_notes_no_bidi
    check (notes is null or notes !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩]');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.trail_conditions
    add constraint trail_conditions_notes_no_c0_controls
    check (notes is null or notes !~ '[\x00-\x08\x0B-\x1F\x7F]');
exception when duplicate_object then null; end $$;

-- ── feedback ─────────────────────────────────────────────────────────────────
do $$ begin
  alter table public.feedback
    add constraint feedback_message_no_bidi
    check (message !~ '[؜‎‏‪‫‬‭‮⁦⁧⁨⁩]');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.feedback
    add constraint feedback_message_no_c0_controls
    check (message !~ '[\x00-\x08\x0B-\x1F\x7F]');
exception when duplicate_object then null; end $$;
