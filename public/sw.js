// Minimal offline app-shell service worker for Shtegu.
// Strategy:
//   - Navigations: network-first, fall back to cache (so the app opens offline).
//   - Static assets (_next, icons): stale-while-revalidate.
//   - OSM map tiles: cache-first, so areas you've already viewed stay available
//     off-grid. NOTE: this is best-effort tile caching. For reliable whole-region
//     offline maps, use a downloaded PMTiles file (see docs/OFFLINE-MAPS.md).
//   - PMTiles basemap (/maps/*.pmtiles): served cache-first when present, so the
//     vector/raster basemap works fully offline. The whole archive is cached as
//     one entry; range requests are satisfied by the browser from that response.
//   - "Download offline map" message: pre-caches the PMTiles archive + a trail
//     page on demand (see CACHE_OFFLINE_MAP below).
//   - Per-region extracted tiles: src/lib/offline-region.ts writes individual
//     vector tiles into this same cache under a synthetic same-origin key
//     (CACHE-KEY SCHEME below). We serve them cache-first when requested.
//
// CACHE-KEY SCHEME (must stay in sync with src/lib/offline-region.ts):
//   /__pmtiles_tile/<archiveId>/<z>/<x>/<y>   -> raw decompressed MVT tile bytes
//   /__pmtiles_region/<trailSlug>             -> JSON manifest of a region cache
// <archiveId> is the archive pathname made path-safe (e.g. "maps_albania.pmtiles").
//
// HONEST NOTE: MapLibre's `pmtiles://` protocol reads tiles via byte-range
// requests against the whole archive URL, NOT via these per-tile URLs, so the
// whole-archive cache (handled below) is what makes the map render offline. The
// per-tile entries are a region-scoped store served here for any consumer that
// fetches tiles by `/{z}/{x}/{y}` path.
const CACHE = "shtegu-v1";
const PMTILES_TILE_PREFIX = "/__pmtiles_tile";
const APP_SHELL = ["/", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

// On-demand offline caching, driven by the "Download offline map" button.
// The page posts { type: "CACHE_OFFLINE_MAP", urls: [...] } with a MessagePort
// to reply on. We cache each URL and report success/failure back.
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "CACHE_OFFLINE_MAP") return;

  const reply = (payload) => {
    const port = event.ports && event.ports[0];
    if (port) port.postMessage(payload);
  };

  event.waitUntil(
    caches
      .open(CACHE)
      .then(async (cache) => {
        for (const url of data.urls || []) {
          // PMTiles archives are large; fetch the whole file once and store it.
          const res = await fetch(url, { cache: "reload" });
          if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);
          await cache.put(url, res.clone());
        }
        reply({ ok: true });
      })
      .catch((err) => reply({ ok: false, error: String(err && err.message || err) })),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isTile = url.hostname.endsWith("tile.openstreetmap.org");
  const isPmtiles = url.pathname.startsWith("/maps/") && url.pathname.endsWith(".pmtiles");
  const isRegionTile = url.pathname.startsWith(PMTILES_TILE_PREFIX);
  // Protomaps glyph/sprite assets (map label fonts + icons). Cache-first so
  // labels render offline — both ones pre-cached during "Download offline map"
  // and any fetched while browsing online.
  const isMapAsset = url.hostname === "protomaps.github.io";

  // Region-scoped extracted tiles: serve cache-first from the per-tile store.
  // These are same-origin synthetic URLs written by offline-region.ts; there is
  // no network origin to fall back to, so a miss is simply a 404.
  if (isRegionTile) {
    event.respondWith(
      caches.match(url.pathname).then(
        (cached) =>
          cached ||
          new Response(null, { status: 404, statusText: "Tile not cached" }),
      ),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          caches.open(CACHE).then((c) => c.put(request, res.clone()));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r ?? caches.match("/"))),
    );
    return;
  }

  // Map label glyphs/sprites: cache-first, fall back to network and cache it.
  if (isMapAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(request, res.clone()));
          return res;
        });
      }),
    );
    return;
  }

  // PMTiles basemap: cache-first. If a cached full-archive response exists, the
  // browser slices the requested byte range out of it, so this works offline.
  // We key on the pathname (ignoring the Range header) to hit the cached entry.
  if (isPmtiles) {
    event.respondWith(
      caches.match(url.pathname).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((res) => {
            // Only cache full 200 responses (not partial 206) under the path key.
            if (res.status === 200) {
              caches.open(CACHE).then((c) => c.put(url.pathname, res.clone()));
            }
            return res;
          })
          .catch(() => caches.match(url.pathname));
      }),
    );
    return;
  }

  if (isTile || url.pathname.startsWith("/_next/") || APP_SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            caches.open(CACHE).then((c) => c.put(request, res.clone()));
            return res;
          })
          .catch(() => cached);
        return cached ?? network;
      }),
    );
  }
});
