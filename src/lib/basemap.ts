// Basemap configuration for the map / offline support.
//
// Coordinates are [lng, lat] everywhere (GeoJSON / MapLibre order).
//
// Three basemap modes, in priority order:
//   1. A full vector/raster MapLibre *style JSON* URL via
//      NEXT_PUBLIC_BASEMAP_STYLE_URL. Use this to point at a Protomaps vector
//      style (the style references a `pmtiles://...` source). This is the way to
//      get a proper vector basemap with water/landcover/roads layers.
//   2. A PMTiles *archive* URL via NEXT_PUBLIC_BASEMAP_PMTILES_URL, or a file
//      bundled at /maps/albania.pmtiles. We build a minimal **raster** style
//      around it (works for raster PMTiles archives without shipping a vector
//      theme). If your archive is vector tiles, prefer mode 1 with a real style.
//   3. Fallback: the public raster OSM tiles (online only).
//
// See docs/OFFLINE-MAPS.md for how to obtain and place an Albania PMTiles file.

import type { StyleSpecification } from "maplibre-gl";
import { layers, LIGHT } from "@protomaps/basemaps";

/** Path where a bundled offline Albania PMTiles archive is expected. */
export const LOCAL_PMTILES_PATH = "/maps/albania.pmtiles";

const STYLE_URL = process.env.NEXT_PUBLIC_BASEMAP_STYLE_URL?.trim() || "";
const PMTILES_URL = process.env.NEXT_PUBLIC_BASEMAP_PMTILES_URL?.trim() || "";
// Our shipped Albania archive is vector MVT, so a hosted PMTiles URL is styled
// with the Protomaps vector theme by default. Set this to "raster" only if you
// point NEXT_PUBLIC_BASEMAP_PMTILES_URL at a raster-tile archive instead.
const PMTILES_KIND =
  process.env.NEXT_PUBLIC_BASEMAP_PMTILES_KIND?.trim() === "raster"
    ? "raster"
    : "vector";

/** Raster OSM style — no API key, online only. Used as the final fallback. */
export const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

/**
 * Build a minimal raster style around a PMTiles archive URL. The `pmtiles://`
 * prefix tells MapLibre to use the registered PMTiles protocol.
 */
export function rasterPmtilesStyle(pmtilesUrl: string): StyleSpecification {
  return {
    version: 8,
    sources: {
      basemap: {
        type: "raster",
        url: `pmtiles://${pmtilesUrl}`,
        tileSize: 256,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [{ id: "basemap", type: "raster", source: "basemap" }],
  };
}

/**
 * Build a full **vector** style around a Protomaps PMTiles archive (our Albania
 * extract is vector MVT). Uses the official @protomaps/basemaps theme layers.
 * The source name must be "protomaps" to match the theme's source-layer refs.
 *
 * Glyphs/sprites load from the Protomaps assets CDN. They're cached by the
 * service worker (cache-first) and can be pre-cached for an area via
 * `offlineGlyphAssets()`, so labels work offline too — see docs/OFFLINE-MAPS.md.
 */
const PROTOMAPS_ASSETS = "https://protomaps.github.io/basemaps-assets";
/** Glyph (font) PBF URL template MapLibre fills with {fontstack}/{range}. */
export const PROTOMAPS_GLYPHS = `${PROTOMAPS_ASSETS}/fonts/{fontstack}/{range}.pbf`;
/** Sprite base URL (MapLibre appends `.json`/`.png` and `@2x`). */
export const PROTOMAPS_SPRITE = `${PROTOMAPS_ASSETS}/sprites/v4/light`;
/** Host serving the above — the service worker caches anything from it. */
export const PROTOMAPS_ASSETS_HOST = "protomaps.github.io";

export function vectorPmtilesStyle(pmtilesUrl: string): StyleSpecification {
  return {
    version: 8,
    glyphs: PROTOMAPS_GLYPHS,
    sprite: PROTOMAPS_SPRITE,
    sources: {
      protomaps: {
        type: "vector",
        url: `pmtiles://${pmtilesUrl}`,
        attribution: "© OpenStreetMap contributors, © Protomaps",
      },
    },
    layers: layers("protomaps", LIGHT, { lang: "en" }),
  } as StyleSpecification;
}

/**
 * The concrete glyph + sprite asset URLs to pre-cache for fully-offline labels.
 * Enumerates every font stack the theme's symbol layers reference, for the
 * Latin Unicode ranges Albanian needs (0–255 covers ë/ç; 256–511 for safety),
 * plus the sprite sheet (1x + 2x). These exact URLs match what MapLibre requests
 * (it replaces {fontstack} with the URL-encoded comma-joined font names).
 */
export function offlineGlyphAssets(): string[] {
  const fontstacks = new Set<string>();
  for (const layer of layers("protomaps", LIGHT, { lang: "en" })) {
    const layout = (layer as { layout?: Record<string, unknown> }).layout;
    const textFont = layout?.["text-font"];
    if (Array.isArray(textFont) && textFont.every((f) => typeof f === "string")) {
      fontstacks.add((textFont as string[]).join(","));
    }
  }
  const ranges = ["0-255", "256-511"];
  const urls: string[] = [];
  for (const fs of fontstacks) {
    for (const range of ranges) {
      urls.push(
        PROTOMAPS_GLYPHS.replace("{fontstack}", encodeURIComponent(fs)).replace(
          "{range}",
          range,
        ),
      );
    }
  }
  urls.push(
    `${PROTOMAPS_SPRITE}.json`,
    `${PROTOMAPS_SPRITE}.png`,
    `${PROTOMAPS_SPRITE}@2x.json`,
    `${PROTOMAPS_SPRITE}@2x.png`,
  );
  return urls;
}

export type BasemapChoice =
  | { kind: "styleUrl"; style: string }
  | { kind: "pmtiles"; style: StyleSpecification; pmtilesUrl: string }
  | { kind: "osm"; style: StyleSpecification };

/**
 * Decide which basemap to use. Async because, when no env var is set, we probe
 * for a bundled /maps/albania.pmtiles file so dropping the file in "just works"
 * without rebuilding. Falls back to OSM if nothing offline is available.
 */
export async function resolveBasemap(): Promise<BasemapChoice> {
  // 1. Explicit full style JSON (e.g. a Protomaps vector style).
  if (STYLE_URL) return { kind: "styleUrl", style: STYLE_URL };

  // 2. Explicit PMTiles archive URL (e.g. hosted on object storage for prod).
  if (PMTILES_URL) {
    const style =
      PMTILES_KIND === "raster"
        ? rasterPmtilesStyle(PMTILES_URL)
        : vectorPmtilesStyle(PMTILES_URL);
    return { kind: "pmtiles", style, pmtilesUrl: PMTILES_URL };
  }

  // 3. Probe for a bundled local archive (our Albania extract is vector MVT).
  if (await localPmtilesExists()) {
    const url = absoluteUrl(LOCAL_PMTILES_PATH);
    return { kind: "pmtiles", style: vectorPmtilesStyle(url), pmtilesUrl: url };
  }

  // 4. Online raster OSM fallback.
  return { kind: "osm", style: OSM_STYLE };
}

/** Resolve a public-dir path to an absolute URL (PMTiles needs absolute). */
export function absoluteUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).toString();
}

/** Does the bundled /maps/albania.pmtiles exist (and is reachable/cached)? */
async function localPmtilesExists(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    // Range request keeps it cheap; PMTiles is a single large file and we only
    // need to know it exists. A cached copy (service worker) also answers here.
    const res = await fetch(LOCAL_PMTILES_PATH, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
    });
    return res.ok || res.status === 206;
  } catch {
    return false;
  }
}

// ── Additional basemap styles ──────────────────────────────────────────────

/** OpenTopoMap — free, no API key, CC-BY-SA. Good for hiking/topo contours. */
export const OPENTOPO_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    opentopo: {
      type: "raster",
      tiles: [
        "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
        "https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
        "https://c.tile.opentopomap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      maxzoom: 17,
      attribution: "© OpenStreetMap contributors, © OpenTopoMap (CC-BY-SA)",
    },
  },
  layers: [{ id: "opentopo", type: "raster", source: "opentopo" }],
};

/**
 * Thunderforest Outdoors — hiking-focused style with trail markers.
 * Requires a free API key: https://www.thunderforest.com/
 */
export function thunderforestOutdoorsStyle(apiKey: string): StyleSpecification {
  return {
    version: 8,
    sources: {
      thunderforest: {
        type: "raster",
        tiles: [
          `https://a.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=${apiKey}`,
          `https://b.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=${apiKey}`,
          `https://c.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=${apiKey}`,
        ],
        tileSize: 256,
        maxzoom: 22,
        attribution: "© Thunderforest, © OpenStreetMap contributors",
      },
    },
    layers: [{ id: "thunderforest", type: "raster", source: "thunderforest" }],
  };
}

export type BaseId = "default" | "topo" | "outdoors";
export type OverlayId = "waymarked" | "mapillary";
