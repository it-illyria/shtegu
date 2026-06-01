-- 0026 — Per-uid upload rate limit on the trail-photos bucket.
--
-- Addresses finding:
--   RT5-H2 — Authenticated callers (incl. anonymous Supabase users from
--            signInAnonymously()) could flood storage.objects for the
--            trail-photos bucket. 0023's INSERT policy gated on
--            auth.role() = 'authenticated' and a valid trail slug, but did
--            not cap upload frequency. A single anon UUID could push
--            thousands of 5 MB blobs before any out-of-band quota tripped.
--
-- This migration replaces 0023's "trail-photos auth insert" policy with one
-- that additionally requires fewer than 20 uploads in the past hour by the
-- current owner (auth.uid()) into this bucket.
--
-- Idempotent. Do not modify earlier migrations.
--
-- OPERATOR CAVEATS:
--   • The COUNT subquery is itself evaluated under RLS — it can only see
--     storage.objects rows the caller is allowed to SELECT. The bucket has a
--     "public read" SELECT policy from 0023 (using bucket_id = 'trail-photos'),
--     so the count is accurate for every caller. If that public-read policy
--     is ever tightened, revisit this rate limit: a more restrictive SELECT
--     policy would undercount and let the limit be bypassed.
--   • Per-row evaluation cost is acceptable at human upload frequency on
--     Supabase free tier — the subquery is indexed by (bucket_id, owner)
--     via the default storage.objects indexes.
--   • Burst race: two parallel INSERTs can both observe count < 20 and both
--     succeed, briefly exceeding the cap. An advisory lock per uid would
--     close this, but for photo upload throttling the small overshoot is
--     acceptable and not worth the lock contention.
--   • Anonymous identity rotation: an attacker calling signInAnonymously()
--     repeatedly gets a fresh auth.uid() and therefore a fresh 20/hr budget.
--     Mitigation lives outside this migration — enable CAPTCHA on anonymous
--     sign-ins in the Supabase dashboard (RT1 reminder) and/or restrict
--     anonymous sign-ins entirely once authenticated upload UX is in place.
--   • The 20/hr cap is per identity per bucket; tune by editing the literal.
--     Lowering mid-flight is safe (existing rows are unaffected); raising is
--     trivially safe.

-- ---------------------------------------------------------------------------
-- RT5-H2 — Replace the 0023 INSERT policy with a rate-limited variant.
-- ---------------------------------------------------------------------------

drop policy if exists "trail-photos auth insert" on storage.objects;

create policy "trail-photos auth insert" on storage.objects
  for insert
  with check (
    bucket_id = 'trail-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] in (select slug from public.trails)
    -- Rate cap: at most 20 uploads per hour per identity to this bucket.
    -- Uses a correlated count subquery; runs per row checked.
    and (
      select count(*) from storage.objects
      where bucket_id = 'trail-photos'
        and owner = auth.uid()
        and created_at > now() - interval '1 hour'
    ) < 20
  );
