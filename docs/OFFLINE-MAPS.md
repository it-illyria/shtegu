# Offline maps (PMTiles)

Shtegu can render its basemap from a single [PMTiles](https://docs.protomaps.com/pmtiles/)
archive instead of online OSM raster tiles. One file covers all of Albania, works
offline, and needs no tile server.

## How the basemap is chosen

`src/lib/basemap.ts` picks a basemap at runtime, in this priority order:

1. **`NEXT_PUBLIC_BASEMAP_STYLE_URL`** — a full MapLibre **style JSON** URL.
   Use this for a proper **vector** basemap (water / landcover / roads layers).
   The style itself references the archive via a `pmtiles://...` source. This is
   the recommended path for a good-looking vector map (e.g. a Protomaps style).
2. **`NEXT_PUBLIC_BASEMAP_PMTILES_URL`** — a PMTiles **archive** URL. Shtegu wraps
   it in a minimal **raster** style. Use this when your archive is raster tiles.
3. **Bundled file at `/maps/albania.pmtiles`** — if no env var is set, the app
   probes for this file and, when present, renders it as a **vector** basemap
   using the official `@protomaps/basemaps` theme (`vectorPmtilesStyle`). Drop a
   Protomaps vector extract in and it "just works", no rebuild needed.
   **This is the shipped default** — an Albania vector extract lives here.
4. **Fallback: online OSM raster tiles** — used when nothing offline is available.

The route line and trailhead marker are drawn on top in every mode, so the trail
is always visible regardless of which basemap loaded.

> Vector vs raster: the bundled-file path expects a **vector** (MVT) Protomaps
> archive (styled via the theme). The `NEXT_PUBLIC_BASEMAP_PMTILES_URL` path wraps
> an archive in a minimal **raster** style instead — use that only for a raster
> archive. The vector theme's glyphs/sprites load from the Protomaps assets CDN;
> the service worker caches them (cache-first), and "Download offline map"
> pre-caches the font ranges + sprite sheet, so **labels work offline too**, not
> just the geometry.

## Getting an Albania PMTiles file

### Option A — extract from the Protomaps daily build (vector)

Protomaps publishes a daily planet PMTiles build. Use the `pmtiles` CLI to extract
just an Albania bounding box (keeps the file small):

```bash
# install the CLI: https://docs.protomaps.com/pmtiles/cli
# Albania bbox (lng/lat): west=19.0 south=39.6 east=21.1 north=42.7
# Pick a recent build date (Protomaps retains roughly the last few weeks):
pmtiles extract \
  https://build.protomaps.com/20260523.pmtiles \
  public/maps/albania.pmtiles \
  --bbox=19.0,39.6,21.1,42.7
```

This produces a **vector** (MVT, zoom 0–15) archive — exactly what the bundled
path expects. The app styles it with `@protomaps/basemaps` (already a dependency),
so no separate style URL is needed. The current Albania extract is ~150 MB; it's
gitignored, so each environment regenerates it with the command above. To refresh,
re-run with a newer build date.

### Option B — build a raster archive

If you prefer the zero-config bundled path, generate a **raster** PMTiles archive
(e.g. with `tippecanoe`/`rio-pmtiles`/`pmtiles convert` from raster tiles) and
drop it at `public/maps/albania.pmtiles`. The raster wrapper style will use it
directly.

## Where to put the file

```
shtegu/public/maps/albania.pmtiles
```

This path is already gitignored (`/public/maps/*.pmtiles`) so the large binary is
never committed. Create the `public/maps/` directory if it does not exist.

## Offline download ("Download offline map")

On a trail page, when a PMTiles basemap is configured, a **Download offline map**
button appears (top-left of the map). It caches:

- the trail's **region tiles** (only the tiles covering the trail's bbox, read
  from the archive by byte-range via the `pmtiles` lib — `src/lib/offline-region.ts`),
- the **whole PMTiles archive** (the dependable render path — see below),
- the **map label glyphs + sprite** (so labels render offline), and
- the trail's own page (`/trails/<slug>`),

so the trail opens and its map (geometry **and** labels) renders with no network.

### How it works & limitations

- The service worker caches the **entire** PMTiles archive as one Cache Storage
  entry. PMTiles normally uses HTTP range requests; the SW serves the cached full
  file and the browser slices the requested byte range out of it. This is simple
  and reliable for a country-sized archive.
- We do **not** do per-region tile extraction (parsing the PMTiles directory to
  cache only a trail's tiles). For a single small country, caching the whole
  archive once covers every trail, which is the better tradeoff.
- The button only appears in modes 2/3 (a known PMTiles archive URL). With a
  remote vector **style URL** (mode 1) the style's own tile URLs would need
  caching, which this helper does not attempt.
- Service workers only register in production builds, so the download button is
  functional in `next build && next start`, not in `next dev`.
