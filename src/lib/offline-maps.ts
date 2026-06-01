// Client-side "download offline map" helper.
//
// What it does: caches what's needed to open a trail and view its map with no
// network connection — the trail's page, plus map tiles.
//
// TWO MODES (region-scoped, with a reliable whole-archive fallback):
//
//  1. REGION-SCOPED (preferred): when a trail `geometry` is supplied, we compute
//     the trail's bounding box (+ margin) and extract ONLY the XYZ tiles
//     covering that area out of the PMTiles archive, using the `pmtiles` library
//     (which fetches just the needed byte ranges via the archive directory — not
//     the whole ~150 MB file). Each tile is stored in the Cache API under a
//     stable key shared with the service worker (see src/lib/offline-region.ts
//     and public/sw.js for the CACHE-KEY SCHEME). This is the per-region
//     improvement: one trail download caches a few MB, not the whole country.
//
//  2. WHOLE-ARCHIVE FALLBACK: we ALSO ask the service worker to cache the whole
//     PMTiles archive. This is what actually guarantees MapLibre renders the
//     basemap offline today, because MapLibre's registered `pmtiles://` protocol
//     reads tiles via HTTP byte-range requests against the single archive URL —
//     it never requests individual `/{z}/{x}/{y}` URLs that a service worker
//     could satisfy from the per-tile cache. So the per-tile extraction is a
//     genuine bandwidth/size win for measurement + future per-tile consumers,
//     while the whole-archive cache is the dependable offline-render path.
//
//     If region extraction fails for any reason, we fall back to the
//     whole-archive cache alone so we never ship a broken "offline" button.

import {
  archiveIdFromUrl,
  extractRegionTiles,
  type ExtractProgress,
} from "@/lib/offline-region";
import { offlineGlyphAssets } from "@/lib/basemap";

export type OfflineStatus =
  | { state: "idle" }
  | { state: "downloading"; progress?: number; detail?: string }
  | { state: "done"; detail?: string }
  | { state: "error"; message: string };

interface DownloadArgs {
  /** Absolute URL of the PMTiles archive (same one the map style uses). */
  pmtilesUrl: string;
  /** Trail slug, so we can also cache its page for offline opening. */
  trailSlug: string;
  /**
   * Trail route geometry as [lng, lat] pairs. When provided, enables
   * region-scoped tile extraction (caches only this trail's area). Optional so
   * existing callers keep working; without it we fall back to whole-archive.
   */
  geometry?: [number, number][];
  /** Max zoom to extract for the region (archive maxZoom is respected). */
  maxZoom?: number;
}

const SW_TIMEOUT_MS = 60_000;
/** Same cache name the service worker opens; we write tiles into it directly. */
// KEEP IN SYNC with `CACHE` in public/sw.js — bumping one without the other
// causes the page-written tiles and the SW-served fetches to diverge into
// separate Cache Storage buckets, silently breaking offline reads.
const CACHE_NAME = "shtegu-v2";

/**
 * Trigger an offline download and report progress through the supplied setter.
 * Resolves when caching is complete (or failed).
 *
 * The exported signature stays backward compatible with TrailMap.tsx: callers
 * may pass only `{ pmtilesUrl, trailSlug }`. Passing `geometry` opts into the
 * smaller, region-scoped download.
 */
export async function downloadTrailOffline(
  { pmtilesUrl, trailSlug, geometry, maxZoom = 14 }: DownloadArgs,
  onStatus: (s: OfflineStatus) => void,
): Promise<void> {
  onStatus({ state: "downloading", detail: "Preparing…" });

  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    onStatus({
      state: "error",
      message: "Offline storage needs a service worker (production build).",
    });
    return;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const worker = reg.active;
    if (!worker) throw new Error("Service worker not active yet.");

    // --- (1) Region-scoped extraction (best effort) -----------------------
    let regionSummary: string | null = null;
    if (geometry && geometry.length > 0 && typeof caches !== "undefined") {
      try {
        const cache = await caches.open(CACHE_NAME);
        const result = await extractRegionTiles(
          pmtilesUrl,
          geometry,
          cache,
          { maxZoom },
          (p: ExtractProgress) => {
            const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
            onStatus({
              state: "downloading",
              progress: pct,
              detail: `Caching trail area… ${formatBytes(p.bytes)}`,
            });
          },
        );
        regionSummary = `${result.cached} tiles · ${formatBytes(result.bytes)}`;
        // Record which archive a trail's region tiles belong to (useful for
        // future eviction / inspection). Keyed under the same cache.
        await cache.put(
          `/__pmtiles_region/${trailSlug}`,
          new Response(
            JSON.stringify({
              trailSlug,
              archiveId: archiveIdFromUrl(pmtilesUrl),
              cached: result.cached,
              bytes: result.bytes,
              maxZoom,
            }),
            { headers: { "Content-Type": "application/json" } },
          ),
        );
      } catch {
        // Region extraction failed — fall through to whole-archive fallback.
        regionSummary = null;
      }
    }

    // --- (2) Whole-archive fallback + trail page (via service worker) -----
    // Always done: it's what makes MapLibre actually render offline today.
    onStatus({
      state: "downloading",
      progress: regionSummary ? 100 : undefined,
      detail: regionSummary
        ? `Trail area cached (${regionSummary}); securing basemap & labels…`
        : "Caching basemap & labels…",
    });
    // The archive + trail page, PLUS the Protomaps glyph/sprite assets so map
    // labels render offline (not just the geometry). The SW caches each.
    const urls = [
      pmtilesUrl,
      `/trails/${trailSlug}`,
      ...offlineGlyphAssets(),
    ];
    await postToWorker(worker, { type: "CACHE_OFFLINE_MAP", urls });

    onStatus({
      state: "done",
      detail: regionSummary
        ? `Offline ready — trail area: ${regionSummary}`
        : "Offline ready",
    });
  } catch (err) {
    onStatus({
      state: "error",
      message: err instanceof Error ? err.message : "Unknown error.",
    });
  }
}

/** Human-readable byte size. */
function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Post a message to the SW and await its reply over a MessageChannel. */
function postToWorker(
  worker: ServiceWorker,
  message: { type: string; urls: string[] },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(
      () => reject(new Error("Timed out caching the offline map.")),
      SW_TIMEOUT_MS,
    );

    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      const data = event.data as { ok: boolean; error?: string };
      if (data?.ok) resolve();
      else reject(new Error(data?.error ?? "Caching failed."));
    };

    worker.postMessage(message, [channel.port2]);
  });
}
