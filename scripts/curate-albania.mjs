// Curate the trail set down to Albania-relevant routes.
//   node --env-file=.env.local scripts/curate-albania.mjs          # dry run (report only)
//   node --env-file=.env.local scripts/curate-albania.mjs --apply  # delete rejects from Supabase
//
// Uses Albania's real administrative boundary (OSM via Nominatim) for an
// accurate point-in-polygon test. Keeps any trail with a meaningful Albanian
// portion (mostly-inside OR border-crossing). The 5 curated trails are never
// touched.

const CURATED = new Set([
  "theth-valbona",
  "llogara-pass-cesar",
  "mount-dajti",
  "gjipe-canyon",
  "pellumbas-cave",
]);

// Keep rule: at least this share of route points inside Albania, OR at least
// this many km of the route inside (catches long border-crossing trails).
const MIN_FRACTION = 0.05;
const MIN_KM_INSIDE = 3;

const R = 6371000;
const toRad = (d) => (d * Math.PI) / 180;
function haversineKm([lng1, lat1], [lng2, lat2]) {
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return (2 * R * Math.asin(Math.sqrt(a))) / 1000;
}

// Ray-casting point-in-ring; ring is [[lng,lat],...].
function inRing([x, y], ring) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// GeoJSON Polygon = [outer, hole1, ...]; inside outer and outside all holes.
function inPolygon(pt, poly) {
  if (!inRing(pt, poly[0])) return false;
  for (let h = 1; h < poly.length; h++) if (inRing(pt, poly[h])) return false;
  return true;
}

function inGeometry(pt, geom) {
  if (geom.type === "Polygon") return inPolygon(pt, geom.coordinates);
  if (geom.type === "MultiPolygon")
    return geom.coordinates.some((poly) => inPolygon(pt, poly));
  return false;
}

async function fetchAlbaniaBoundary() {
  const url =
    "https://nominatim.openstreetmap.org/search?country=Albania&polygon_geojson=1&format=json&limit=1";
  const res = await fetch(url, {
    headers: { "User-Agent": "Shtegu/0.1 (hiking app; trail curation)" },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const [first] = await res.json();
  if (!first?.geojson) throw new Error("No boundary geometry returned");
  return first.geojson;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const { readFile } = await import("node:fs/promises");
  const all = JSON.parse(await readFile("data/osm-trails.json", "utf8"));

  console.log("Fetching Albania boundary from OSM/Nominatim…");
  const boundary = await fetchAlbaniaBoundary();
  console.log(`Boundary: ${boundary.type}`);

  const keep = [], drop = [];
  for (const t of all) {
    const g = t.geometry;
    const step = Math.max(1, Math.floor(g.length / 60));
    let inN = 0, tot = 0, kmInside = 0;
    for (let i = 0; i < g.length; i += step) {
      tot++;
      const here = inGeometry(g[i], boundary);
      if (here) inN++;
      if (i > 0 && here) kmInside += haversineKm(g[i - step], g[i]);
    }
    const frac = inN / tot;
    if (frac >= MIN_FRACTION || kmInside >= MIN_KM_INSIDE) {
      keep.push({ ...t, _frac: frac, _km: kmInside });
    } else {
      drop.push(t);
    }
  }

  console.log(`\nKeep: ${keep.length}   Drop: ${drop.length}   (of ${all.length} OSM)`);
  console.log("Plus 5 curated trails, always kept.\n");
  console.log("--- keeping (top 20 by Albanian length) ---");
  keep.sort((a, b) => b._km - a._km).slice(0, 20).forEach((t) =>
    console.log(`  ${Math.round(t._km)} km in AL  ${(t._frac * 100).toFixed(0)}%  ${t.name}`),
  );

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to delete the rejects from Supabase.");
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(url, key);

  const dropSlugs = drop.map((t) => t.slug).filter((s) => !CURATED.has(s));
  console.log(`\nDeleting ${dropSlugs.length} non-Albanian trails…`);
  // Delete in batches to keep the URL short.
  for (let i = 0; i < dropSlugs.length; i += 50) {
    const batch = dropSlugs.slice(i, i + 50);
    const { error } = await sb.from("trails").delete().in("slug", batch);
    if (error) console.error("  batch error:", error.message);
  }
  const { count } = await sb.from("trails").select("*", { count: "exact", head: true });
  console.log(`Done. Trails remaining in Supabase: ${count}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
