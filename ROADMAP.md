# Roadmap

Ordered roughly by dependency. Each item is independently shippable.
Status legend: ✅ done · 🟡 partial · ⬜ not started.

## 1. ✅ Real trail data (replace seed)
- ✅ Pull Albanian hiking routes from **OpenStreetMap** via Overpass
  (`scripts/import-osm.mjs`). Computes distance; optional elevation-based ascent.
- ✅ Curate to Albania's real border (`scripts/curate-albania.mjs`).
- ✅ Enrich editorial fields — difficulty/region/summary/logistics
  (`scripts/enrich-trails.mjs`) + verified detail from published guides and
  iconic missing trails (`scripts/enrich-verified.mjs`). **55 trails live.**
- ✅ `src/data/trails.ts` retained as the offline seed fallback.

## 2. ✅ Read trails from Supabase
- ✅ `src/lib/trails-repo.ts` reads from Supabase, falls back to seed.
- 🟡 `trails_nearby()` RPC exists and is wired in the repo; a "trails near me"
  UI view is still to be added.

## 3. ✅ Offline maps
- ✅ MapLibre wired to the `pmtiles://` protocol with a graceful fallback chain
  (vector style URL → PMTiles archive → bundled `/maps/albania.pmtiles` → OSM).
- ✅ Shipped an **Albania vector PMTiles extract** (Protomaps, ~150 MB,
  gitignored — regenerate via `docs/OFFLINE-MAPS.md`), styled with
  `@protomaps/basemaps`.
- ✅ "Download offline map" caches the archive + trail page + **region tiles**
  (per-trail bbox extraction, live in `TrailMap`) + **label glyphs/sprites**, so
  geometry and labels both render offline.

## 4. 🟡 Auth + community
- ✅ Review UI: submit + display, backed by Supabase with RLS and **anonymous
  sign-in** (no login wall).
- ✅ Full Supabase **email magic-link auth** (`AuthProvider` + `AuthButton`);
  signed-in users post reviews under their identity, anonymous still works.
- ⬜ OAuth providers (needs dashboard config), photo uploads, user-submitted
  trails with moderation.

## 5. ✅ Richer trail UX
- ✅ Elevation profile chart (`ElevationProfile` + `src/lib/elevation.ts`, via the
  Open-Meteo elevation API).
- ✅ "Trails near me" view (`/near-me`, client-side haversine on geolocation).
- ✅ POI map layers — water, springs, viewpoints, huts, passes from Overpass,
  with a legend/toggle (`src/lib/pois.ts` + `TrailMap`).
- ✅ Trailhead weather (Open-Meteo forecast) on the detail page
  (`WeatherWidget` + `src/lib/weather.ts`).

## 5b. ✅ Tests
- ✅ Vitest + Testing Library set up (`npm test`). 11 tests across elevation/
  weather libs, the `useGeolocation` hook, and `DifficultyBadge`.

## 6. Native capabilities (optional)
- Wrap with **Capacitor** to unlock background GPS tracking, recorded tracks,
  and app-store distribution from the same codebase.

## Tech debt / hardening
- Add `next.config` headers (cache-control for `/sw.js`, CSP).
- Replace raster OSM tiles before any real traffic (tile usage policy).
- Real PNG/maskable icons via a favicon generator.
- Tests for `useGeolocation` and the data layer.
