// Re-push data/osm-trails.json into Supabase (no network fetch from Overpass).
// Use this when the DB has lost rows but the local JSON is intact.
//
// Usage:
//   node --env-file=.env.local scripts/repush-osm.mjs

import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(url, key);
const trails = JSON.parse(await readFile("data/osm-trails.json", "utf8"));
console.log(`Loaded ${trails.length} trails from data/osm-trails.json`);

let ok = 0, fail = 0;
for (const t of trails) {
  const { error } = await sb.from("trails").upsert(
    {
      slug: t.slug,
      name: t.name,
      region: t.region,
      summary: t.summary,
      difficulty: t.difficulty,
      distance_km: t.distanceKm,
      ascent_m: t.ascentM,
      duration_h: t.durationHours,
      best_months: t.bestMonths,
      logistics: t.logistics,
      source: t.source,
      route_geojson: { type: "LineString", coordinates: t.geometry },
      trailhead_geojson: { type: "Point", coordinates: t.trailhead },
    },
    { onConflict: "slug" },
  );
  if (error) { console.error(`  upsert ${t.slug}: ${error.message}`); fail++; }
  else ok++;
}
console.log(`Done: ${ok} upserted, ${fail} failed.`);
