// Elevation profile helpers.
//
// Coordinates are [lng, lat] (GeoJSON / MapLibre order) everywhere — never swap.
// We sample a route down to ~64 evenly-spaced points and fetch their elevations
// from the Open-Meteo Elevation API, which is CORS-enabled and accepts up to 100
// coordinates per request, so a single browser fetch covers the whole profile.

/** A single point on the elevation profile. */
export interface ElevationPoint {
  /** Cumulative distance from the start of the route, in kilometres. */
  distanceKm: number;
  /** Elevation above sea level, in metres. */
  elevationM: number;
}

/** A computed elevation profile plus summary statistics. */
export interface ElevationProfile {
  points: ElevationPoint[];
  /** Lowest elevation along the route, in metres. */
  minM: number;
  /** Highest elevation along the route, in metres. */
  maxM: number;
  /** Sum of all positive elevation deltas (total climb), in metres. */
  totalAscentM: number;
  /** Total route length, in kilometres. */
  totalDistanceKm: number;
}

const SAMPLE_COUNT = 64;
const EARTH_RADIUS_KM = 6371;

/** Great-circle distance between two [lng, lat] points, in kilometres. */
function haversineKm(a: [number, number], b: [number, number]): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Reduce a route to at most `count` evenly-spaced points (by index), always
 * keeping the first and last coordinate.
 */
function sampleRoute(
  route: [number, number][],
  count: number,
): [number, number][] {
  if (route.length <= count) return route;
  const sampled: [number, number][] = [];
  const step = (route.length - 1) / (count - 1);
  for (let i = 0; i < count; i++) {
    sampled.push(route[Math.round(i * step)]);
  }
  return sampled;
}

interface OpenMeteoElevationResponse {
  elevation?: number[];
}

/**
 * Build an elevation profile for a [lng, lat] route. Samples the route to
 * ~64 points and resolves their elevations via the Open-Meteo Elevation API.
 *
 * Returns `null` on any failure (network error, bad response, empty input) so
 * callers can render a graceful fallback.
 */
export async function buildElevationProfile(
  route: [number, number][],
  signal?: AbortSignal,
): Promise<ElevationProfile | null> {
  if (!route || route.length < 2) return null;

  const sampled = sampleRoute(route, SAMPLE_COUNT);
  const latitudes = sampled.map(([, lat]) => lat).join(",");
  const longitudes = sampled.map(([lng]) => lng).join(",");
  const url = `/api/elevation?lat=${latitudes}&lng=${longitudes}`;

  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const data: OpenMeteoElevationResponse = await res.json();
    const elevations = data.elevation;
    if (!Array.isArray(elevations) || elevations.length !== sampled.length) {
      return null;
    }

    const points: ElevationPoint[] = [];
    let cumulativeKm = 0;
    let minM = Infinity;
    let maxM = -Infinity;
    let totalAscentM = 0;

    for (let i = 0; i < sampled.length; i++) {
      if (i > 0) {
        cumulativeKm += haversineKm(sampled[i - 1], sampled[i]);
        const delta = elevations[i] - elevations[i - 1];
        if (delta > 0) totalAscentM += delta;
      }
      const elevationM = elevations[i];
      if (elevationM < minM) minM = elevationM;
      if (elevationM > maxM) maxM = elevationM;
      points.push({ distanceKm: cumulativeKm, elevationM });
    }

    return {
      points,
      minM,
      maxM,
      totalAscentM,
      totalDistanceKm: cumulativeKm,
    };
  } catch {
    return null;
  }
}
