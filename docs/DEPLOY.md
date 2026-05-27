# Deploying Shtegu to Vercel

This guide deploys the Shtegu hiking PWA (Next.js 16 App Router) to **Vercel**.
The app lives in the **`shtegu/` subfolder** of the repo — that detail matters in
several steps below.

> The app runs fine without Supabase or an offline basemap (it falls back to seed
> data + online OSM tiles). This guide gets you to a real production deploy with
> Supabase wired up; the offline vector basemap is an optional add-on (step 5).

---

## 1. Prerequisites

1. A **Vercel account** ([vercel.com](https://vercel.com)).
2. The repo **pushed to GitHub** (or GitLab/Bitbucket).
3. **Node 20+** (Vercel's default for new projects is fine).
4. Note the monorepo layout: the Next.js app is in **`shtegu/`**, not the repo
   root. When importing, set:
   - **Root Directory** → `shtegu`
   - **Framework Preset** → **Next.js** (auto-detected)
   - **Build Command** → `next build` (default; leave as-is)
   - **Output** → handled by Vercel automatically (no `output` dir to set)

---

## 2. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (apply to
Production, and Preview if you want previews to hit Supabase):

```
NEXT_PUBLIC_SUPABASE_URL        = https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY   = <anon / publishable key>
```

Optional (only if enabling the offline/vector basemap — see step 5):

```
NEXT_PUBLIC_BASEMAP_PMTILES_URL = https://<host>/albania.pmtiles
```

### ⚠️ CRITICAL security note — do NOT add the service role key

**Never** set `SUPABASE_SERVICE_ROLE_KEY` in Vercel. That key bypasses Row Level
Security and is only used by **local Node scripts** (`scripts/import-osm.mjs`
import/curate/enrich/`--push`). It must never reach the client **or** the
deployed server. Keep it in your local **`.env.local` only**.

> Anything prefixed `NEXT_PUBLIC_` is exposed to the browser — so the anon key is
> public by design (RLS protects the data). The service role key is not, and must
> stay off Vercel entirely.

---

## 3. Supabase setup (before first deploy)

Full walkthrough: [SETUP-SUPABASE.md](./SETUP-SUPABASE.md). Minimum to do before
deploying:

1. Create the project, then in **SQL Editor** run:
   - `supabase/schema.sql` (PostGIS, `trails` + `reviews`, RLS, `trails_nearby()`)
   - `supabase/migrations/0002_review_abuse.sql` (review abuse / rate-limit rules)
2. **Authentication → Sign In / Providers → Anonymous sign-ins → ON**
   (the review form uses anonymous sign-in so visitors can post without a login).
3. **Authentication → Attack Protection → enable CAPTCHA** (guards anonymous
   sign-in abuse).
4. **Authentication → URL Configuration** → add your **Vercel production URL**
   (e.g. `https://shtegu.vercel.app`) and your **preview URLs**
   (e.g. `https://*.vercel.app` or specific preview domains) as Site URL /
   Redirect URLs, so magic-link redirects resolve correctly.

Copy the project's `NEXT_PUBLIC_SUPABASE_URL` and anon key into the Vercel env
vars from step 2.

---

## 4. The offline basemap file (and why it won't deploy)

The bundled vector basemap `public/maps/albania.pmtiles` is **~150 MB** and is
**gitignored** (`/public/maps/*.pmtiles` in `.gitignore`). It is therefore **not
committed and not deployed** — Vercel is not suited to serving a 150 MB static
asset.

**Consequence:** with no basemap configured in production, the map **gracefully
falls back to online OSM raster tiles**. This is fully functional — you just get
raster OSM instead of the vector/offline basemap. Trail lines and the trailhead
marker still render on top in every mode.

**This is a perfectly fine v1 launch state.** Ship it like this, and optionally
add the vector basemap later via step 5.

---

## 5. (Optional) Enable the vector + offline basemap in production

To get the Protomaps **vector** basemap (and offline download) in prod, host the
PMTiles archive somewhere that supports **HTTP range requests + CORS**:

- Supabase Storage **public bucket**, **Cloudflare R2**, or **AWS S3**.

Then:

1. Generate the Albania extract (see [OFFLINE-MAPS.md](./OFFLINE-MAPS.md)) and
   upload `albania.pmtiles` to the bucket.
2. Set the public URL in Vercel:
   ```
   NEXT_PUBLIC_BASEMAP_PMTILES_URL = https://<host>/albania.pmtiles
   ```
3. Redeploy.

Notes:

- The app renders the configured archive as a vector basemap using the Protomaps
  theme (`src/lib/basemap.ts`).
- **No manual CSP edit is needed.** The CSP in `next.config.ts` automatically
  derives and allows the basemap host from `NEXT_PUBLIC_BASEMAP_PMTILES_URL`.
- **Known limitation:** full *offline* caching of a **cross-origin** archive is
  not guaranteed — documented in [OFFLINE-MAPS.md](./OFFLINE-MAPS.md). Online
  vector rendering works regardless.

---

## 6. Deploy

1. In Vercel, **Add New → Project → Import** your GitHub repo.
2. Set **Root Directory = `shtegu`**.
3. Confirm Framework Preset = **Next.js**, Build Command = `next build`.
4. Add the **environment variables** from step 2.
5. Click **Deploy**.

After the first deploy, **every push to the connected branch auto-deploys**
(production branch → Production; other branches → Preview deployments).

---

## 7. Post-deploy verification checklist

Open the deployed site and confirm:

- [ ] **Home page** loads and lists trails.
- [ ] A **trail detail page** (`/trails/<slug>`) loads with its map.
- [ ] **Reviews** post and persist on reload; the **rate limit** and the
      **guest badge** behave as expected.
- [ ] **Open DevTools → Console** and check for **CSP violations**. If the map,
      a tile, or a fetch is blocked, add the blocked origin to `connect-src`
      and/or `img-src` in `next.config.ts`, then redeploy.
- [ ] **PWA installable** — manifest loads and icons appear (install prompt /
      "Add to Home Screen").
- [ ] **`/safety`** page is reachable.

> Service workers only register in production builds, so PWA/offline behavior is
> testable on the live Vercel deploy (not in `next dev`).

---

## 8. Security reminders

- **Rotate any keys** that were ever shared in plaintext (chat, screenshots,
  commits). Regenerate them in the Supabase dashboard.
- Keep `SUPABASE_SERVICE_ROLE_KEY` **out of Vercel** — local `.env.local` only
  (see step 2).
- The **security headers + CSP** are defined in `next.config.ts` and apply
  automatically on Vercel (CSP, HSTS, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and a tight
  `Permissions-Policy` that allows only same-origin geolocation).
