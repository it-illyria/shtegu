// Per-region (per-trail) tile math + extraction helpers for offline maps.
//
// Coordinates are [lng, lat] everywhere (GeoJSON / MapLibre order).
//
// WHY THIS EXISTS
// ---------------
// The bundled Albania PMTiles archive is ~150 MB. Caching it whole to view one
// trail wastes storage and bandwidth. This module computes the exact set of XYZ
// web-mercator tiles that cover a trail's bounding box (plus a margin) across a
// range of zoom levels, and pulls just those tiles' bytes out of the archive
// using the `pmtiles` library (which resolves tile -> byte range via the
// archive directory, so only small ranges are fetched — not the whole file).
//
// The extracted tiles are written into the Cache API under a STABLE KEY SCHEME
// shared with the service worker (see CACHE-KEY SCHEME below and public/sw.js).

import { PMTiles, FetchSource, type Header } from "pmtiles";

// ---------------------------------------------------------------------------
// CACHE-KEY SCHEME (must stay in sync with public/sw.js)
// ---------------------------------------------------------------------------
// Each extracted vector tile is stored as its own Cache API entry whose request
// key is a synthetic, same-origin URL:
//
//   /__pmtiles_tile/<archiveId>/<z>/<x>/<y>
//
// where <archiveId> is a stable, filesystem-safe id derived from the archive's
// pathname (e.g. "maps_albania.pmtiles"). The cached Response body is the raw,
// already-decompressed tile bytes (MVT) with Content-Type
// application/x-protobuf. The service worker can serve these back if/when a
// consumer requests pmtiles tiles by {z}/{x}/{y} path.
//
// NOTE (honest limitation): MapLibre's registered `pmtiles://` protocol does
// NOT fetch individual `/{z}/{x}/{y}` URLs — it issues HTTP byte-range requests
// against the single archive URL and slices tiles out client-side. Therefore
// these per-tile cache entries are not, on their own, what makes the existing
// MapLibre style render offline; the whole-archive cache (kept as a fallback in
// offline-maps.ts / sw.js) is what guarantees offline rendering today. The
// per-region extraction here genuinely fetches only the region's bytes, powers
// accurate size/progress reporting, and provides a path-addressable tile cache
// for any future per-tile consumer (or a custom transformRequest).
// ---------------------------------------------------------------------------

/** Prefix for synthetic per-tile cache keys. Shared with public/sw.js. */
export const PMTILES_TILE_PREFIX = "/__pmtiles_tile";

export interface TileCoord {
  z: number;
  x: number;
  y: number;
}

export interface BBox {
  /** [minLng, minLat, maxLng, maxLat] */
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface RegionExtractResult {
  /** Number of tiles that existed in the archive and were cached. */
  cached: number;
  /** Total candidate tiles inspected (some may be absent / over water). */
  total: number;
  /** Approximate bytes written to the cache. */
  bytes: number;
}

/** Derive a stable, path-safe archive id from a PMTiles URL's pathname. */
export function archiveIdFromUrl(pmtilesUrl: string): string {
  let pathname = pmtilesUrl;
  try {
    pathname = new URL(pmtilesUrl, "http://local").pathname;
  } catch {
    // Already a bare path; fall through.
  }
  return pathname.replace(/^\/+/, "").replace(/[^a-zA-Z0-9._-]/g, "_");
}

/** Build the synthetic same-origin cache key for one extracted tile. */
export function tileCacheKey(
  archiveId: string,
  { z, x, y }: TileCoord,
): string {
  return `${PMTILES_TILE_PREFIX}/${archiveId}/${z}/${x}/${y}`;
}

/**
 * Compute a trail's bounding box from its [lng, lat] geometry, expanded by a
 * margin (in degrees) so the cached area extends a little past the route.
 */
export function bboxFromGeometry(
  geometry: [number, number][],
  marginDeg = 0.02,
): BBox {
  if (geometry.length === 0) {
    throw new Error("Cannot compute bbox of empty geometry.");
  }
  let west = geometry[0][0];
  let east = geometry[0][0];
  let south = geometry[0][1];
  let north = geometry[0][1];
  for (const [lng, lat] of geometry) {
    if (lng < west) west = lng;
    if (lng > east) east = lng;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  }
  return {
    west: west - marginDeg,
    south: south - marginDeg,
    east: east + marginDeg,
    north: north + marginDeg,
  };
}

/** Web-mercator lon/lat -> tile x/y at a given zoom (standard XYZ slippy math). */
function lngLatToTile(lng: number, lat: number, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return {
    x: clampTile(x, n),
    y: clampTile(y, n),
  };
}

function clampTile(v: number, n: number): number {
  if (v < 0) return 0;
  if (v > n - 1) return n - 1;
  return v;
}

/**
 * Enumerate all XYZ tiles covering `bbox` for every zoom in [minZoom, maxZoom].
 * The count grows with zoom; a per-zoom `maxTilesPerZoom` cap guards against a
 * runaway region (very long trail at high zoom) blowing up storage.
 */
export function tilesForBBox(
  bbox: BBox,
  minZoom: number,
  maxZoom: number,
  maxTilesPerZoom = 1500,
): TileCoord[] {
  const out: TileCoord[] = [];
  for (let z = minZoom; z <= maxZoom; z++) {
    const min = lngLatToTile(bbox.west, bbox.north, z); // north == smaller y
    const max = lngLatToTile(bbox.east, bbox.south, z); // south == larger y
    const x0 = Math.min(min.x, max.x);
    const x1 = Math.max(min.x, max.x);
    const y0 = Math.min(min.y, max.y);
    const y1 = Math.max(min.y, max.y);

    const count = (x1 - x0 + 1) * (y1 - y0 + 1);
    if (count > maxTilesPerZoom) {
      // Skip this (too-detailed) zoom rather than over-cache. Lower zooms still
      // give a usable, if coarser, offline view of the region.
      continue;
    }
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        out.push({ z, x, y });
      }
    }
  }
  return out;
}

export interface ExtractProgress {
  done: number;
  total: number;
  bytes: number;
}

/**
 * Extract every tile covering `geometry` from the PMTiles archive at
 * `pmtilesUrl` and write each into `cache` under the shared per-tile key.
 *
 * Returns counts + approximate byte total for progress/size reporting.
 *
 * Only the byte ranges for the needed tiles (plus the archive header and
 * directory pages) are fetched from the network — NOT the whole archive.
 */
export async function extractRegionTiles(
  pmtilesUrl: string,
  geometry: [number, number][],
  cache: Cache,
  opts: { minZoom?: number; maxZoom?: number; marginDeg?: number } = {},
  onProgress?: (p: ExtractProgress) => void,
): Promise<RegionExtractResult> {
  const archive = new PMTiles(new FetchSource(pmtilesUrl));
  let header: Header;
  try {
    header = await archive.getHeader();
  } catch (err) {
    throw new Error(
      `Could not read PMTiles header: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Clamp the requested zoom window to what the archive actually contains.
  const minZoom = Math.max(opts.minZoom ?? 0, header.minZoom);
  const maxZoom = Math.min(opts.maxZoom ?? 14, header.maxZoom);

  const archiveId = archiveIdFromUrl(pmtilesUrl);
  const bbox = bboxFromGeometry(geometry, opts.marginDeg ?? 0.02);
  const tiles = tilesForBBox(bbox, minZoom, maxZoom);

  let cached = 0;
  let bytes = 0;
  let done = 0;

  for (const t of tiles) {
    let range: { data: ArrayBuffer } | undefined;
    try {
      range = await archive.getZxy(t.z, t.x, t.y);
    } catch {
      range = undefined; // Missing/over-water tiles are expected; skip them.
    }
    if (range) {
      const body = range.data;
      bytes += body.byteLength;
      await cache.put(
        tileCacheKey(archiveId, t),
        new Response(body, {
          headers: {
            "Content-Type": "application/x-protobuf",
            "Content-Length": String(body.byteLength),
            "X-Pmtiles-Tile": `${t.z}/${t.x}/${t.y}`,
          },
        }),
      );
      cached++;
    }
    done++;
    onProgress?.({ done, total: tiles.length, bytes });
  }

  return { cached, total: tiles.length, bytes };
}
