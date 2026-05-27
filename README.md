# Shtegu 🏔️

A Progressive Web App for hiking in Albania — discover trails, plan logistics,
read community reviews, and navigate on-trail (online or off).

> **Shteg** (def. *shtegu*) — Albanian for "path" / "trail".

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript + Tailwind v4 |
| Maps | MapLibre GL JS (raster OSM today → PMTiles vector for offline) |
| Backend | Supabase (Postgres + PostGIS + Auth + Storage) |
| Offline | Web App Manifest + service worker (`public/sw.js`) |

## Getting started

```bash
npm run dev      # http://localhost:3005
npm run build    # production build
```

The app works out of the box with **local seed data** ([src/data/trails.ts](src/data/trails.ts)).
Supabase is optional until you wire it up.

### Enabling Supabase

Full walkthrough in [docs/SETUP-SUPABASE.md](docs/SETUP-SUPABASE.md). Short version:
run [supabase/schema.sql](supabase/schema.sql), enable anonymous sign-ins, then
put your URL + keys in `.env.local`. Without keys the app falls back to seed data.

### Loading real trail data (OpenStreetMap)

```bash
node scripts/import-osm.mjs            # → data/osm-trails.json (215+ routes)
node scripts/import-osm.mjs --push     # upsert into Supabase
```

## What's built

- **Trail discovery** — list + detail pages with **search & difficulty filter**.
- **Real data pipeline** — `scripts/import-osm.mjs` pulls hiking routes from
  OpenStreetMap (Overpass) with computed distance and optional ascent.
- **Data layer** — `src/lib/trails-repo.ts` reads from Supabase, falls back to seed.
- **Maps** — MapLibre route line + trailhead marker, fits bounds automatically.
- **Offline maps** — `pmtiles://` basemap support with a fallback chain and a
  "Download offline map" button (see [docs/OFFLINE-MAPS.md](docs/OFFLINE-MAPS.md)).
- **On-trail navigation** — `useGeolocation` watch drives a live position marker.
- **Logistics** — transport, guesthouses, season, water notes per trail, with
  verified detail for the iconic routes from published hiking guides.
- **Community reviews** — submit + display, backed by Supabase with RLS and
  anonymous sign-in (no login wall).
- **PWA** — installable, offline app shell, best-effort tile caching.

Currently **55 curated + OpenStreetMap trails** live in Supabase, cleaned to
Albania's real border.

## Roadmap

See [ROADMAP.md](ROADMAP.md) — real OSM data pipeline, PMTiles offline regions,
auth + review UI, elevation profiles, and a Capacitor wrap for background GPS.

## Honest limitations

- A PWA **cannot** track GPS with the screen off / app backgrounded — only a
  native wrapper (Capacitor) can. Foreground navigation works.
- Sample trail geometry is hand-traced and approximate — **not for navigation**
  until replaced with real OSM/GPX data.
- Tile caching is best-effort; reliable offline regions need PMTiles.
