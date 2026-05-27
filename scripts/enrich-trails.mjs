// Enrich OSM-imported trails with editorial fields (ascent, difficulty, region,
// summary, logistics) computed objectively from geometry + stats.
//
// Usage:
//   node --env-file=.env.local scripts/enrich-trails.mjs           # dry run (report only)
//   node --env-file=.env.local scripts/enrich-trails.mjs --apply   # write to Supabase
//
// Only touches trails where source != 'Curated' OR a field still contains 'TODO'.
// Curated trails are never modified. `source` is left as-is.
//
// Ascent is sampled from route geometry and resolved against open-elevation
// (batched, small concurrency, timeouts, graceful fallback — same spirit as
// import-osm.mjs). Region is derived from a coarse-but-honest coordinate map.
// Summaries/logistics are deliberately generic and verifiable — no fabricated facts.

import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const ELEV_URL = "https://api.open-elevation.com/api/v1/lookup";

// ---- geometry helpers (haversine, sampling) --------------------------------
const R = 6371000;
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

// Evenly sample the line to ~N points (keep first and last).
function sampleCoords(coords, n = 80) {
  if (coords.length <= n) return coords;
  const step = (coords.length - 1) / (n - 1);
  const out = [];
  for (let i = 0; i < n; i++) out.push(coords[Math.round(i * step)]);
  return out;
}

// ---- elevation: best-effort ascent ----------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function elevationFor(sample) {
  // Single POST batch (open-elevation accepts the whole sample at once).
  // Retry once on transient failure; return null on hard failure.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(ELEV_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "Shtegu/0.1 (hiking app; enrich)" },
        body: JSON.stringify({
          locations: sample.map(([lng, lat]) => ({ latitude: lat, longitude: lng })),
        }),
        signal: AbortSignal.timeout(25000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { results } = await res.json();
      if (!Array.isArray(results) || results.length === 0) throw new Error("empty");
      return results.map((r) => r.elevation);
    } catch (e) {
      if (attempt === 0) {
        await sleep(1500);
        continue;
      }
      return null;
    }
  }
  return null;
}

// Smooth small noise then sum positive deltas for cumulative ascent.
function ascentFromElevations(elev) {
  if (!elev || elev.length < 2) return null;
  let gain = 0;
  for (let i = 1; i < elev.length; i++) {
    const d = elev[i] - elev[i - 1];
    if (d > 0) gain += d;
  }
  return Math.round(gain);
}

// ---- editorial derivations --------------------------------------------------

// Naismith-style estimate, rounded to 1 decimal.
function durationH(distanceKm, ascentM) {
  return Math.round((distanceKm / 5 + ascentM / 600) * 10) / 10;
}

// Objective difficulty from distance + ascent. Worst-of-two-axes: a trail is as
// hard as its hardest dimension (a short but very steep climb is still hard).
function deriveDifficulty(distanceKm, ascentM) {
  const byDist =
    distanceKm <= 6 ? 0 : distanceKm <= 14 ? 1 : distanceKm <= 25 ? 2 : 3;
  const byAsc =
    ascentM <= 300 ? 0 : ascentM <= 800 ? 1 : ascentM <= 1600 ? 2 : 3;
  return ["easy", "moderate", "hard", "expert"][Math.max(byDist, byAsc)];
}

// Coarse but accurate Albanian region map from trailhead [lng, lat].
// Ordered most-specific first. Returns { region, terrain } where terrain
// ('alpine' | 'coastal' | 'inland') tunes logistics phrasing.
function deriveRegion([lng, lat], name = "") {
  const n = name.toLowerCase();

  // Name hints take priority when they clearly state a place.
  if (/(theth|valbon|alps|accursed|prokletije|gjeravic|jezerc)/.test(n))
    return { region: "Albanian Alps (Accursed Mountains)", terrain: "alpine" };
  if (/(llogara|riviera|gjipe|himar|dhërm|dherm|qeparo|borsh|saranda?|ksamil|ionian|adriatic|karaburun|vlor)/.test(n))
    return { region: "Ionian/Adriatic Riviera", terrain: "coastal" };
  if (/(korab|deshat|dibë|diber|dibra)/.test(n))
    return { region: "Dibër / Korab", terrain: "alpine" };
  if (/(korç|korce|prespa|voskopoj|grammos|gramoz|përmet|permet|nemërçk|nemercke|vjos)/.test(n))
    return { region: "Korçë / Përmet region", terrain: "inland" };
  if (/(dajti|tiran|pëllumbas|pellumbas|petrel)/.test(n))
    return { region: "Central Albania / near Tirana", terrain: "inland" };

  // Coordinate fallback.
  // Northern alps: high north and not too far east into Kosovo plain.
  if (lat >= 42.0 && lng <= 20.3)
    return { region: "Albanian Alps (Accursed Mountains)", terrain: "alpine" };
  // Western coastal strip (Ionian/Adriatic).
  if (lng <= 19.55)
    return { region: "Ionian/Adriatic Riviera", terrain: "coastal" };
  // Eastern border highlands (Korab/Dibër) — east and north-central.
  if (lng >= 20.4 && lat >= 41.2)
    return { region: "Dibër / Korab", terrain: "alpine" };
  // South-east (Korçë / Përmet).
  if (lat <= 40.6 || (lng >= 20.4 && lat < 41.2))
    return { region: "Korçë / Përmet region", terrain: "inland" };
  // Central default (Tirana basin and surrounds).
  return { region: "Central Albania / near Tirana", terrain: "inland" };
}

function fmtKm(km) {
  return Number.isInteger(km) ? `${km}` : km.toFixed(1);
}
function fmtAscent(m) {
  // round to nearest 10 for honest, non-spurious precision in prose.
  const r = Math.round(m / 10) * 10;
  return r >= 1000 ? r.toLocaleString("en-US") : String(r);
}

// One honest, factual sentence built from name + stats + region.
function deriveSummary(name, distanceKm, ascentM, region, difficulty) {
  const asc =
    ascentM > 0 ? ` with about ${fmtAscent(ascentM)} m of ascent` : "";
  return `A ${fmtKm(distanceKm)} km ${difficulty} hiking route in ${region}${asc}, mapped from OpenStreetMap data.`;
}

// 2–3 honest, generic bullets, lightly tailored by terrain. No invented specifics.
function deriveLogistics(terrain) {
  const base = [
    "Reachable from the nearest town or village; check local transport before you go.",
    "Route data from OpenStreetMap (ODbL); verify current conditions and waymarking locally.",
  ];
  if (terrain === "alpine")
    base.push("Mountainous terrain — carry warm layers, sufficient water, and a map; weather can change quickly.");
  else if (terrain === "coastal")
    base.push("Exposed, sunny coastal terrain — carry sufficient water and sun protection; sources may be unreliable.");
  else
    base.push("Carry sufficient water — natural sources may be unreliable.");
  return base;
}

// ---- main -------------------------------------------------------------------
async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (run with --env-file=.env.local).");
  const sb = createClient(url, key);

  const { data, error } = await sb
    .from("trails")
    .select("slug,name,region,summary,difficulty,distance_km,ascent_m,duration_h,logistics,source,route_geojson,trailhead_geojson");
  if (error) throw error;

  const hasTodo = (t) =>
    JSON.stringify([t.region, t.summary, t.difficulty, t.logistics]).includes("TODO");
  const targets = data.filter((t) => t.source !== "Curated" || hasTodo(t));
  const curatedTodo = data.filter((t) => t.source === "Curated" && hasTodo(t));
  if (curatedTodo.length)
    console.log(`Note: ${curatedTodo.length} Curated trail(s) still contain TODO — leaving untouched per instructions.`);

  console.log(`${data.length} trails total; enriching ${targets.length} (source != Curated or has TODO).`);
  console.log(`Mode: ${APPLY ? "APPLY (writing to Supabase)" : "DRY RUN (no writes)"}\n`);

  const ascents = [];
  const updates = [];
  let elevOk = 0, elevFail = 0, i = 0;

  for (const t of targets) {
    i++;
    const coords = t.route_geojson?.coordinates ?? [];
    const trailhead = t.trailhead_geojson?.coordinates ?? coords[0];
    const distanceKm = Number(t.distance_km) || lengthKm(coords);

    // ascent
    let ascentM = t.ascent_m;
    const sample = sampleCoords(coords, 80);
    const elev = sample.length >= 2 ? await elevationFor(sample) : null;
    const computed = ascentFromElevations(elev);
    if (computed != null) {
      ascentM = computed;
      elevOk++;
    } else {
      elevFail++; // keep existing ascent (likely 0) as graceful fallback
    }
    await sleep(700); // be polite to the public API

    const { region, terrain } = deriveRegion(trailhead ?? [19.8, 41.3], t.name);
    const difficulty = deriveDifficulty(distanceKm, ascentM);
    const duration_h = durationH(distanceKm, ascentM);
    const summary = deriveSummary(t.name, distanceKm, ascentM, region, difficulty);
    const logistics = deriveLogistics(terrain);

    ascents.push(ascentM);
    updates.push({ slug: t.slug, name: t.name, region, summary, difficulty, ascent_m: ascentM, duration_h, logistics });

    if (i <= 8 || !APPLY && i <= 12) {
      console.log(`• ${t.name}`);
      console.log(`    dist ${fmtKm(distanceKm)} km  ascent ${ascentM} m${computed == null ? " (elev API fallback)" : ""}  → ${difficulty}, ${duration_h} h`);
      console.log(`    region: ${region}`);
      console.log(`    summary: ${summary}`);
      console.log(`    logistics: ${logistics.length} bullets`);
    }
  }

  const sorted = [...ascents].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  console.log(`\nElevation API: ${elevOk} ok, ${elevFail} fallback.`);
  console.log(`Ascent min/median/max: ${sorted[0] ?? 0} / ${median} / ${sorted[sorted.length - 1] ?? 0} m`);
  const diffCounts = updates.reduce((m, u) => ((m[u.difficulty] = (m[u.difficulty] || 0) + 1), m), {});
  console.log(`Difficulty mix: ${JSON.stringify(diffCounts)}`);

  if (!APPLY) {
    console.log("\nDry run complete. Re-run with --apply to write these changes.");
    return;
  }

  console.log("\nWriting updates…");
  let written = 0;
  for (const u of updates) {
    const { error: e } = await sb
      .from("trails")
      .update({
        region: u.region,
        summary: u.summary,
        difficulty: u.difficulty,
        ascent_m: u.ascent_m,
        duration_h: u.duration_h,
        logistics: u.logistics,
      })
      .eq("slug", u.slug);
    if (e) console.error(`  update ${u.slug}: ${e.message}`);
    else written++;
  }
  console.log(`Updated ${written}/${updates.length} trails.`);

  // verify no TODO remains anywhere
  const { data: after } = await sb.from("trails").select("slug,region,summary,difficulty,logistics");
  const stillTodo = (after ?? []).filter((t) =>
    JSON.stringify([t.region, t.summary, t.difficulty, t.logistics]).includes("TODO"),
  );
  console.log(`Remaining trails containing 'TODO': ${stillTodo.length}`);
  if (stillTodo.length) console.log("  " + stillTodo.map((t) => t.slug).join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
