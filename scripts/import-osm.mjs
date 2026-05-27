// Import hiking routes for Albania from OpenStreetMap via the Overpass API.
//
// Usage:
//   node scripts/import-osm.mjs                 # fetch + write data/osm-trails.json
//   node scripts/import-osm.mjs --elevation     # also compute ascent (slow; public API)
//   node scripts/import-osm.mjs --push          # also upsert into Supabase (needs keys)
//
// What it does:
//   1. Queries Overpass for `route=hiking` relations within Albania's bbox.
//   2. Stitches member-way geometry into an ordered [lng, lat] LineString.
//   3. Computes distance (haversine) and, best-effort, ascent from an elevation API.
//   4. Writes editorial-ready records to data/osm-trails.json. Fields OSM can't
//      provide (summary, difficulty, logistics, bestMonths) are left as TODO for
//      a human to enrich — then feed them through the `add-trail` workflow.
//
// OSM data is © OpenStreetMap contributors (ODbL) — keep attribution visible.

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const OVERPASS = "https://overpass-api.de/api/interpreter";
// Albania bounding box: south, west, north, east
const BBOX = "39.6,19.0,42.7,21.1";
const OUT = "data/osm-trails.json";

const QUERY = `
[out:json][timeout:90];
relation["route"="hiking"]["name"](${BBOX});
out geom;
`;

const R = 6371000; // earth radius, metres
const toRad = (d) => (d * Math.PI) / 180;
function haversine([lng1, lat1], [lng2, lat2]) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function lengthKm(coords) {
  let m = 0;
  for (let i = 1; i < coords.length; i++) m += haversine(coords[i - 1], coords[i]);
  return Math.round((m / 1000) * 10) / 10;
}

// Stitch member ways into one ordered coordinate list. Overpass `out geom` gives
// each way's geometry as [{lat, lon}]; we reorder to [lng, lat] and concatenate,
// flipping a segment when its endpoints connect better reversed.
function buildLine(relation) {
  const ways = (relation.members ?? []).filter(
    (m) => m.type === "way" && Array.isArray(m.geometry),
  );
  const segs = ways.map((w) => w.geometry.map((p) => [p.lon, p.lat]));
  if (segs.length === 0) return [];

  const out = [...segs[0]];
  const near = (a, b) => haversine(a, b) < 50; // 50 m tolerance
  for (let i = 1; i < segs.length; i++) {
    let seg = segs[i];
    const tail = out[out.length - 1];
    if (near(tail, seg[seg.length - 1]) && !near(tail, seg[0])) seg = [...seg].reverse();
    out.push(...seg);
  }
  return out;
}

// Best-effort ascent via open-elevation. Returns null if the service is down so
// the import still succeeds; enrich ascent later from a DEM if needed.
async function ascentM(coords) {
  const sample = coords.filter((_, i) => i % Math.ceil(coords.length / 100) === 0);
  try {
    const res = await fetch("https://api.open-elevation.com/api/v1/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locations: sample.map(([lng, lat]) => ({ latitude: lat, longitude: lng })),
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const { results } = await res.json();
    let gain = 0;
    for (let i = 1; i < results.length; i++) {
      const d = results[i].elevation - results[i - 1].elevation;
      if (d > 0) gain += d;
    }
    return Math.round(gain);
  } catch {
    return null;
  }
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics (ë→e, ç→c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  const push = process.argv.includes("--push");
  const doElevation = process.argv.includes("--elevation");
  console.log("Querying Overpass for Albanian hiking routes…");
  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Shtegu/0.1 (hiking app; OSM import)",
    },
    body: "data=" + encodeURIComponent(QUERY),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}: ${await res.text()}`);
  const { elements } = await res.json();
  const relations = elements.filter((e) => e.type === "relation");
  console.log(`Found ${relations.length} hiking relations.`);

  const trails = [];
  for (const rel of relations) {
    const line = buildLine(rel);
    if (line.length < 2) continue;
    const name   = rel.tags?.name ?? `OSM relation ${rel.id}`;
    const nameSq = rel.tags?.["name:sq"] ?? null;
    process.stdout.write(`  • ${name} … `);
    const ascent = doElevation ? await ascentM(line) : null;
    console.log(
      `${line.length} pts, ${lengthKm(line)} km` +
        (doElevation ? `, ascent ${ascent ?? "?"} m` : ""),
    );
    trails.push({
      slug: slugify(name),
      name,
      nameSq,
      osmId: rel.id,
      osmType: "relation",
      region: rel.tags?.["addr:region"] ?? "TODO: region",
      summary: "TODO: write a one-line summary",
      difficulty: "moderate", // TODO: review
      distanceKm: lengthKm(line),
      ascentM: ascent ?? 0, // TODO if 0/unknown
      durationHours: Math.round((lengthKm(line) / 5 + (ascent ?? 0) / 600) * 10) / 10,
      geometry: line,
      trailhead: line[0],
      bestMonths: "TODO",
      logistics: ["TODO: transport, guesthouses, water"],
      source: "OpenStreetMap (ODbL)",
    });
  }

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(trails, null, 2));
  console.log(`\nWrote ${trails.length} trails → ${OUT}`);
  console.log("Review/enrich the TODO fields, then add via the add-trail workflow.");

  if (push) await pushToSupabase(trails);
}

async function pushToSupabase(trails) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // service role bypasses RLS
  if (!url || !key) {
    console.warn(
      "\n--push skipped: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
    return;
  }
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(url, key);
  for (const t of trails) {
    const { error } = await sb.from("trails").upsert(
      {
        slug: t.slug,
        name: t.name,
        name_sq: t.nameSq ?? null,
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
    if (error) console.error(`  upsert ${t.slug}: ${error.message}`);
  }
  console.log(`Pushed ${trails.length} trails to Supabase.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
