// Points-of-interest (POI) fetching for the trail map.
//
// Given a route geometry ([lng, lat][]), we compute a modest bounding box (with
// a small margin) and query the OpenStreetMap Overpass API for nearby features
// hikers care about: water sources, springs, viewpoints, mountain huts and
// passes. The result is a GeoJSON FeatureCollection of points the map can drop
// straight into a `geojson` source.
//
// Coordinates are [lng, lat] everywhere (GeoJSON / MapLibre order).
//
// Design notes:
//   - Network is best-effort: on timeout/error/HTTP failure we return an EMPTY
//     FeatureCollection so the map keeps working offline or when Overpass is
//     down. POIs are an enhancement, never a hard dependency.
//   - The bbox is intentionally kept small (margin in degrees, capped) so the
//     Overpass query stays cheap and fast.

import type { FeatureCollection, Point } from "geojson";

/** Discrete POI categories we surface on the map. */
export type PoiKind = "water" | "spring" | "viewpoint" | "hut" | "pass";

/** Properties attached to each POI feature. */
export interface PoiProperties {
  kind: PoiKind;
  name: string;
}

export type PoiCollection = FeatureCollection<Point, PoiProperties>;

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

/** Margin added around the route bbox, in degrees (~1.1 km per 0.01°). */
const BBOX_MARGIN_DEG = 0.02;
/** Hard cap on bbox span so a long trail still yields a cheap query. */
const MAX_BBOX_SPAN_DEG = 0.6;
/** Abort the Overpass request after this long; POIs are non-essential. */
const REQUEST_TIMEOUT_MS = 12_000;

/** A south-west / north-east bounding box in degrees. */
interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

const EMPTY: PoiCollection = { type: "FeatureCollection", features: [] };

/** Minimal shape of the Overpass JSON response we rely on. */
interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
}
interface OverpassResponse {
  elements?: OverpassElement[];
}

/**
 * Fetch POIs near a route. Returns an empty FeatureCollection on any failure.
 */
export async function fetchTrailPois(
  geometry: [number, number][],
  signal?: AbortSignal,
): Promise<PoiCollection> {
  if (!geometry.length) return EMPTY;

  const bbox = clampBBox(routeBBox(geometry));
  const query = buildOverpassQuery(bbox);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  // Abort if the caller cancels (e.g. component unmount).
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }
  }

  try {
    // GET keeps the request a CORS-safe simple request — no preflight, no
    // forbidden headers (browsers strip User-Agent overrides). POST worked in
    // dev but produced silent failures in production behind a CDN.
    const url = `${OVERPASS_URL}?data=${encodeURIComponent(query)}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      console.warn("[POIs] Overpass HTTP", res.status, res.statusText);
      return EMPTY;
    }

    const data = (await res.json()) as OverpassResponse;
    return toFeatureCollection(data.elements ?? []);
  } catch (e) {
    console.warn("[POIs] Overpass fetch failed", e);
    return EMPTY;
  } finally {
    clearTimeout(timer);
  }
}

/** Compute the bounding box of the route. */
function routeBBox(geometry: [number, number][]): BBox {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [lng, lat] of geometry) {
    if (lng < west) west = lng;
    if (lng > east) east = lng;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  }
  return {
    south: south - BBOX_MARGIN_DEG,
    west: west - BBOX_MARGIN_DEG,
    north: north + BBOX_MARGIN_DEG,
    east: east + BBOX_MARGIN_DEG,
  };
}

/** Keep the bbox span within MAX_BBOX_SPAN_DEG, centred on the route. */
function clampBBox(b: BBox): BBox {
  const clampSpan = (lo: number, hi: number): [number, number] => {
    const span = hi - lo;
    if (span <= MAX_BBOX_SPAN_DEG) return [lo, hi];
    const mid = (lo + hi) / 2;
    return [mid - MAX_BBOX_SPAN_DEG / 2, mid + MAX_BBOX_SPAN_DEG / 2];
  };
  const [west, east] = clampSpan(b.west, b.east);
  const [south, north] = clampSpan(b.south, b.north);
  return { south, west, north, east };
}

/** Build an Overpass QL query for our POI categories within the bbox. */
function buildOverpassQuery(b: BBox): string {
  const bbox = `${b.south},${b.west},${b.north},${b.east}`;
  return [
    "[out:json][timeout:25];",
    "(",
    `  node["amenity"="drinking_water"](${bbox});`,
    `  node["natural"="spring"](${bbox});`,
    `  node["tourism"="viewpoint"](${bbox});`,
    `  node["tourism"="alpine_hut"](${bbox});`,
    `  node["tourism"="wilderness_hut"](${bbox});`,
    `  node["mountain_pass"="yes"](${bbox});`,
    `  node["natural"="saddle"](${bbox});`,
    ");",
    "out body;",
  ].join("\n");
}

/** Map an Overpass element's tags to one of our POI kinds, if any. */
function classify(tags: Record<string, string>): PoiKind | null {
  if (tags.amenity === "drinking_water") return "water";
  if (tags.natural === "spring") return "spring";
  if (tags.tourism === "viewpoint") return "viewpoint";
  if (tags.tourism === "alpine_hut" || tags.tourism === "wilderness_hut") {
    return "hut";
  }
  if (tags.mountain_pass === "yes" || tags.natural === "saddle") return "pass";
  return null;
}

/** Sensible default labels per kind when a feature has no name tag. */
const DEFAULT_NAME: Record<PoiKind, string> = {
  water: "Drinking water",
  spring: "Spring",
  viewpoint: "Viewpoint",
  hut: "Mountain hut",
  pass: "Mountain pass",
};

/** Convert Overpass elements to a GeoJSON FeatureCollection of points. */
function toFeatureCollection(elements: OverpassElement[]): PoiCollection {
  const features: PoiCollection["features"] = [];
  for (const el of elements) {
    if (typeof el.lat !== "number" || typeof el.lon !== "number") continue;
    const tags = el.tags ?? {};
    const kind = classify(tags);
    if (!kind) continue;
    const name = tags.name?.trim() || DEFAULT_NAME[kind];
    features.push({
      type: "Feature",
      id: `${el.type}/${el.id}`,
      properties: { kind, name },
      geometry: { type: "Point", coordinates: [el.lon, el.lat] },
    });
  }
  return { type: "FeatureCollection", features };
}
