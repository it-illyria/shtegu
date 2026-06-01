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
// Bumped v1 -> v2 to evict any entries possibly poisoned by the previously
// unvalidated CACHE_OFFLINE_MAP handler. On activate, all non-matching caches
// are deleted, forcing clients to re-fetch from trusted origins.
const CACHE = "shtegu-v2";
// Tiles live in their own namespace so we can evict them under LRU pressure
// without disturbing app-shell entries. Kept on the activate keep-list.
const TILE_CACHE = "shtegu-tiles-v2";
const PMTILES_TILE_PREFIX = "/__pmtiles_tile";
const APP_SHELL = ["/", "/icon.svg", "/manifest.webmanifest"];

// Soft LRU bound on the tile cache. Cache API iteration order is insertion
// order, so slicing from the front gives us FIFO eviction.
const MAX_TILE_ENTRIES = 800;
const PRUNE_BATCH = 100;
async function pruneTileCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_TILE_ENTRIES) return;
  const drop = keys.slice(0, PRUNE_BATCH);
  await Promise.all(drop.map((k) => cache.delete(k)));
}

// Allowlist of hosts that CACHE_OFFLINE_MAP messages are permitted to cache.
// If your deployment serves PMTiles from a different host (see PMTILES_URL env
// / src/lib/basemap.ts PROTOMAPS_ASSETS_HOST), add that host here BY HAND —
// the service worker cannot read env vars at runtime.
const ALLOWED_CACHE_HOSTS = new Set([
  self.location.host,            // same-origin (/maps/*.pmtiles, app assets)
  "protomaps.github.io",         // glyphs/sprites (PROTOMAPS_ASSETS_HOST)
  "tile.openstreetmap.org",      // OSM raster tiles
]);

const MAX_CACHE_URLS = 50;
const MAX_TOTAL_BYTES = 250 * 1024 * 1024; // 250 MB

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
        Promise.all(keys.filter((k) => k !== CACHE && k !== TILE_CACHE).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

// On-demand offline caching, driven by the "Download offline map" button.
// The page posts { type: "CACHE_OFFLINE_MAP", urls: [...] } with a MessagePort
// to reply on. We cache each URL and report success/failure back.
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data) return;
  if (data.type !== "CACHE_OFFLINE_MAP" && data.type !== "CLEAR_USER_CACHE") return;

  const reply = (payload) => {
    const port = event.ports && event.ports[0];
    if (port) port.postMessage(payload);
  };

  // Verify the message came from a same-origin window client. Without this,
  // any frame that managed to postMessage to the SW could trigger caching.
  // Note: event.source may be null for some message sources; in that case we
  // refuse rather than fail open. WindowClient exposes .url; if it doesn't,
  // skip the check with a comment and rely on the host/size validation below.
  const source = event.source;
  if (!source || typeof source.url !== "string") {
    reply({ ok: false, error: "untrusted source" });
    return;
  }
  try {
    if (new URL(source.url).origin !== self.location.origin) {
      reply({ ok: false, error: "cross-origin source rejected" });
      return;
    }
  } catch {
    reply({ ok: false, error: "invalid source url" });
    return;
  }

  // RT4-M10: drop navigation-cached HTML on signOut so the next user on this
  // device doesn't see the previous user's authed pages from cache. Keep the
  // app-shell + static asset entries (/_next/*) so the app still boots offline.
  if (data.type === "CLEAR_USER_CACHE") {
    event.waitUntil((async () => {
      try {
        const c = await caches.open(CACHE);
        const keys = await c.keys();
        await Promise.all(keys.map(async (req) => {
          const u = new URL(req.url);
          // Only same-origin navigations have HTML cache entries.
          if (u.origin === self.location.origin && !u.pathname.startsWith("/_next/")) {
            await c.delete(req);
          }
        }));
      } catch {}
    })());
    return;
  }

  // Validate urls: must be an array of strings, bounded length, allowlisted hosts.
  const urls = data.urls;
  if (!Array.isArray(urls) || !urls.every((u) => typeof u === "string")) {
    reply({ ok: false, error: "urls must be an array of strings" });
    return;
  }
  if (urls.length > MAX_CACHE_URLS) {
    reply({ ok: false, error: `too many urls (max ${MAX_CACHE_URLS})` });
    return;
  }
  for (const u of urls) {
    let parsed;
    try {
      parsed = new URL(u);
    } catch {
      reply({ ok: false, error: `invalid url: ${u}` });
      return;
    }
    if (!ALLOWED_CACHE_HOSTS.has(parsed.host)) {
      reply({ ok: false, error: `host not allowed: ${parsed.host}` });
      return;
    }
  }

  event.waitUntil(
    caches
      .open(CACHE)
      .then(async (cache) => {
        let totalBytes = 0;
        for (const url of urls) {
          // PMTiles archives are large; fetch the whole file once and store it.
          // redirect: "error" makes the SW throw on any 3xx so an open-redirect
          // on an allowlisted host cannot cause attacker-controlled bytes to be
          // cached under a trusted key.
          const res = await fetch(url, { cache: "reload", redirect: "error" });
          if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);
          // Defense in depth: verify the effective response host is still on
          // the allowlist, in case `redirect: "error"` is ignored.
          let effectiveHost;
          try {
            effectiveHost = new URL(res.url).host;
          } catch {
            throw new Error(`invalid response url for ${url}`);
          }
          if (!ALLOWED_CACHE_HOSTS.has(effectiveHost)) {
            throw new Error(`response host not allowed: ${effectiveHost}`);
          }
          const len = Number(res.headers.get("content-length") || 0);
          totalBytes += len;
          if (totalBytes > MAX_TOTAL_BYTES) {
            throw new Error("cache budget exceeded");
          }
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
          // Only cache successful, same-origin, non-redirect responses. This
          // avoids persisting error pages, opaque cross-origin redirects, or
          // attacker-controlled redirected content under a trusted URL key.
          if (res.ok && res.type === "basic") {
            caches.open(CACHE).then((c) => c.put(request, res.clone()));
          }
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

  if (isTile) {
    event.respondWith(
      caches.open(TILE_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const network = fetch(request)
            .then((res) => {
              // Only cache OK image responses from a trusted (basic/cors)
              // origin. Skips error pages, opaque redirects, and any
              // non-image surprise (HTML captive portal, etc.).
              const ct = res.headers.get("content-type") || "";
              const trusted = res.type === "basic" || res.type === "cors";
              if (res.ok && trusted && ct.startsWith("image/")) {
                cache.put(request, res.clone()).then(() => pruneTileCache(cache));
              }
              return res;
            })
            .catch(() => cached);
          return cached ?? network;
        }),
      ),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/") || APP_SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            if (res.ok && (res.type === "basic" || res.type === "cors")) {
              caches.open(CACHE).then((c) => c.put(request, res.clone()));
            }
            return res;
          })
          .catch(() => cached);
        return cached ?? network;
      }),
    );
  }
});
