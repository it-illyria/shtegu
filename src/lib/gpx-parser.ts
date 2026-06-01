// Parse hiking route files into [lng, lat][] coordinates (lng-first — matches MapLibre/PostGIS).
// Supported formats: GPX, KML, KMZ, TCX, GeoJSON, FIT.

// ---------------------------------------------------------------------------
// GPX
// ---------------------------------------------------------------------------
export function parseGpx(text: string): [number, number][] {
  const doc = new DOMParser().parseFromString(text, "text/xml");

  const fromSelector = (sel: string): [number, number][] => {
    const coords: [number, number][] = [];
    doc.querySelectorAll(sel).forEach((pt) => {
      const lat = parseFloat(pt.getAttribute("lat") ?? "");
      const lon = parseFloat(pt.getAttribute("lon") ?? "");
      if (!isNaN(lat) && !isNaN(lon)) coords.push([lon, lat]);
    });
    return coords;
  };

  const trk = fromSelector("trkpt");
  if (trk.length > 0) return trk;
  return fromSelector("rtept");
}

// ---------------------------------------------------------------------------
// KML
// ---------------------------------------------------------------------------
export function parseKml(text: string): [number, number][] {
  const doc = new DOMParser().parseFromString(text, "text/xml");
  const coords: [number, number][] = [];

  // <coordinates> holds "lng,lat,alt" triples separated by whitespace.
  doc.querySelectorAll("coordinates").forEach((el) => {
    (el.textContent ?? "").trim().split(/\s+/).forEach((triple) => {
      const parts = triple.split(",");
      if (parts.length >= 2) {
        const lng = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        if (!isNaN(lng) && !isNaN(lat)) coords.push([lng, lat]);
      }
    });
  });

  return coords;
}

// ---------------------------------------------------------------------------
// KMZ  (ZIP containing a .kml file — uses fflate)
// ---------------------------------------------------------------------------
export async function parseKmz(buffer: ArrayBuffer): Promise<[number, number][]> {
  const { unzipSync } = await import("fflate");
  // Reject any single entry whose inflated size exceeds 20 MB — a small KMZ
  // claiming a multi-GB inflated payload is a decompression bomb.
  // The `filter` checks CDH-reported size which an attacker can lie about.
  // The post-unzip `length` sum is the authoritative cap — fflate decodes
  // the local file header bytes, so .length is the actually-decompressed
  // size. Keep both: CDH filter blocks obvious bombs cheaply; sum check
  // catches LFH-lying attacks.
  const files = unzipSync(new Uint8Array(buffer), {
    filter: (file) => file.originalSize > 0 && file.originalSize < 20 * 1024 * 1024,
  });
  // Defense in depth: even if every entry is under the per-file cap, the sum
  // of many small entries could still blow memory. Cap aggregate at 30 MB.
  let total = 0;
  for (const k of Object.keys(files)) {
    total += files[k].length;
    if (total > 30 * 1024 * 1024) throw new Error("KMZ too large");
  }
  const kmlKey = Object.keys(files).find((k) => k.toLowerCase().endsWith(".kml"));
  if (!kmlKey) return [];
  const kmlText = new TextDecoder().decode(files[kmlKey]);
  return parseKml(kmlText);
}

// ---------------------------------------------------------------------------
// TCX  (Garmin Training Center XML)
// ---------------------------------------------------------------------------
export function parseTcx(text: string): [number, number][] {
  const doc = new DOMParser().parseFromString(text, "text/xml");
  const coords: [number, number][] = [];

  doc.querySelectorAll("Trackpoint").forEach((tp) => {
    const lat = parseFloat(tp.querySelector("LatitudeDegrees")?.textContent ?? "");
    const lon = parseFloat(tp.querySelector("LongitudeDegrees")?.textContent ?? "");
    if (!isNaN(lat) && !isNaN(lon)) coords.push([lon, lat]);
  });

  return coords;
}

// ---------------------------------------------------------------------------
// GeoJSON
// ---------------------------------------------------------------------------
export function parseGeoJson(text: string): [number, number][] | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let obj: any = JSON.parse(text);
    if (obj.type === "FeatureCollection" && Array.isArray(obj.features) && obj.features.length > 0) {
      obj = obj.features[0].geometry;
    } else if (obj.type === "Feature") {
      obj = obj.geometry;
    }
    if (obj?.type === "LineString" && Array.isArray(obj.coordinates)) {
      return obj.coordinates as [number, number][];
    }
    if (obj?.type === "MultiLineString" && Array.isArray(obj.coordinates)) {
      return (obj.coordinates as [number, number][][]).flat();
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// FIT  (Garmin binary — uses fit-file-parser via dynamic import)
// ---------------------------------------------------------------------------
export async function parseFit(buffer: ArrayBuffer): Promise<[number, number][]> {
  const { default: FitParser } = await import("fit-file-parser");
  return new Promise((resolve) => {
    const parser = new FitParser({ force: true, mode: "both" });
    parser.parse(buffer, (error, data) => {
      if (error || !data.records) return resolve([]);
      const coords = data.records
        .filter((r) => r.position_lat != null && r.position_long != null)
        .map((r) => [r.position_long!, r.position_lat!] as [number, number]);
      resolve(coords);
    });
  });
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

/** Hard upper bound on route file size. 5 MB is plenty for any real GPX/FIT/KML
 *  recording — anything larger is almost certainly hostile or malformed. */
export const MAX_ROUTE_FILE_BYTES = 5 * 1024 * 1024;

/** Parse any supported route file into [lng, lat][] coordinates. Returns null on failure.
 *  Throws Error("file too large") if the file exceeds MAX_ROUTE_FILE_BYTES. */
export async function parseRouteFile(file: File): Promise<[number, number][] | null> {
  if (file.size > MAX_ROUTE_FILE_BYTES) {
    throw new Error("file too large");
  }
  const name = file.name.toLowerCase();

  if (name.endsWith(".gpx")) {
    const coords = parseGpx(await file.text());
    return coords.length > 0 ? coords : null;
  }

  if (name.endsWith(".kml")) {
    const coords = parseKml(await file.text());
    return coords.length > 0 ? coords : null;
  }

  if (name.endsWith(".kmz")) {
    const coords = await parseKmz(await file.arrayBuffer());
    return coords.length > 0 ? coords : null;
  }

  if (name.endsWith(".tcx")) {
    const coords = parseTcx(await file.text());
    return coords.length > 0 ? coords : null;
  }

  if (name.endsWith(".fit")) {
    const coords = await parseFit(await file.arrayBuffer());
    return coords.length > 0 ? coords : null;
  }

  if (name.endsWith(".geojson") || name.endsWith(".json")) {
    return parseGeoJson(await file.text());
  }

  // Unknown extension: try text-based formats in order, then FIT.
  const text = await file.text();
  const gpx = parseGpx(text);
  if (gpx.length > 0) return gpx;
  const kml = parseKml(text);
  if (kml.length > 0) return kml;
  const tcx = parseTcx(text);
  if (tcx.length > 0) return tcx;
  const json = parseGeoJson(text);
  if (json) return json;
  return parseFit(await file.arrayBuffer());
}
