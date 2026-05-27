// Delete all non-Albanian trails from Supabase, keeping only those whose
// trailhead falls inside Albania's geographic polygon.
//
// Usage:
//   node --env-file=.env.local scripts/filter-albania.mjs

import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

// Albania boundary polygon [lng, lat], refined to actual borders.
// Excludes Montenegro (N), Kosovo/N.Macedonia (NE/E), Greece (S).
const ALBANIA = [
  [19.467,42.007],[19.370,42.100],[19.380,42.250],[19.550,42.450],
  [19.680,42.580],[19.780,42.660],[19.900,42.680],[20.010,42.650],
  [20.080,42.560],[20.100,42.400],[20.160,42.320],[20.350,42.280],
  [20.566,42.065],[20.591,41.874],[20.565,41.563],[20.620,41.086],
  [20.680,40.905],[20.826,40.460],[20.658,40.096],[20.347,39.827],
  [19.993,39.658],[19.817,39.731],[19.480,40.008],[19.316,40.463],
  [19.291,40.912],[19.389,41.340],[19.357,41.798],[19.467,42.007]
];

// Explicitly excluded border-area trails that are in Montenegro, not Albania.
const EXCLUDE_SLUGS = new Set([
  "brezojevice-visitor",
  "pepice-visitor",
]);

function inPoly(pt, poly) {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

const sb = createClient(url, key);

// 1. Fetch all trail slugs + trailhead coords from Supabase.
const { data, error } = await sb.from("trails").select("slug,trailhead_geojson");
if (error) { console.error("Fetch failed:", error.message); process.exit(1); }
console.log(`Fetched ${data.length} trails from Supabase.`);

// 2. Determine which slugs to keep (Albanian) vs delete.
const keepSlugs = new Set();
const deleteSlugs = [];

for (const row of data) {
  const coords = row.trailhead_geojson?.coordinates; // [lng, lat]
  if (!coords) { deleteSlugs.push(row.slug); continue; }
  if (EXCLUDE_SLUGS.has(row.slug)) { deleteSlugs.push(row.slug); continue; }
  if (inPoly(coords, ALBANIA)) keepSlugs.add(row.slug);
  else deleteSlugs.push(row.slug);
}

console.log(`Keeping ${keepSlugs.size} Albanian trails.`);
console.log(`Deleting ${deleteSlugs.length} non-Albanian trails.`);

// 3. Delete in batches of 50.
let deleted = 0;
for (let i = 0; i < deleteSlugs.length; i += 50) {
  const batch = deleteSlugs.slice(i, i + 50);
  const { error: e } = await sb.from("trails").delete().in("slug", batch);
  if (e) console.error(`  delete batch error: ${e.message}`);
  else deleted += batch.length;
}

console.log(`Done: deleted ${deleted} trails, ${keepSlugs.size} remain.`);
