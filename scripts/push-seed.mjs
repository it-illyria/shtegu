// Push the curated seed trails (src/data/trails.ts) into Supabase.
// Run with Node's TS stripping + env file:
//   node --experimental-strip-types --env-file=.env.local scripts/push-seed.mjs
//
// Uses the service-role/secret key so it can write past RLS. The type-only
// import in trails.ts is stripped at runtime, so no path-alias resolution needed.

import { trails } from "../src/data/trails.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(url, key);

const rows = trails.map((t) => ({
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
  source: t.source ?? "Curated",
  route_geojson: { type: "LineString", coordinates: t.geometry },
  trailhead_geojson: { type: "Point", coordinates: t.trailhead },
}));

const { error } = await sb.from("trails").upsert(rows, { onConflict: "slug" });
if (error) {
  console.error("Upsert failed:", error.message);
  process.exit(1);
}
console.log(`Pushed ${rows.length} curated trails to Supabase.`);
