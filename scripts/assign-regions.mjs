// Assign each trail to one of Albania's 4 traditional geographic regions based on
// trailhead coordinates, then write the new region value to Supabase.
//
// Albania's 4 regions (traditional geographic divisions):
//   Rajoni Verior & Verilindor  – Shkodër, Lezhë, Kukës, Dibër counties (north + northeast)
//   Rajoni Perëndimor           – Tiranë, Durrës, Elbasan, Fier counties (west / centre)
//   Rajoni Juglindor            – Korçë, Berat counties (southeast)
//   Rajoni Jugor                – Vlorë, Gjirokastër counties (south)
//
// Usage:
//   node --env-file=.env.local scripts/assign-regions.mjs          # dry run
//   node --env-file=.env.local scripts/assign-regions.mjs --apply  # write to Supabase

import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");

// ── Classification logic ─────────────────────────────────────────────────────
// Ordered from most-specific to least. All coordinate comparisons use [lng, lat].
function assignRegion(lng, lat) {
  // ── North / Northeast (Shkodër, Lezhë, Kukës, Dibër) ──
  // Everything north of ~41.5° is highland northern Albania.
  if (lat >= 41.5) return "Rajoni Verior & Verilindor";

  // ── South (lat < 40.7) – split east vs. west ──
  if (lat < 40.7) {
    // East of 20.5° at low latitude = Korçë county south (Kolonjë / Leskovik)
    if (lng >= 20.5) return "Rajoni Juglindor";
    // West = Vlorë coast, Gjirokastër, south Ionian
    return "Rajoni Jugor";
  }

  // ── Mid-south (40.7 ≤ lat < 41.5) ──
  // East of 20.3° = Korçë county or eastern Berat (Juglindor)
  if (lng >= 20.3) return "Rajoni Juglindor";

  // Everything else in the central band
  return "Rajoni Perëndimor";
}

// ── Main ─────────────────────────────────────────────────────────────────────
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const { data: trails, error } = await sb
  .from("trails")
  .select("slug,name,region,trailhead_geojson")
  .order("name");
if (error) throw error;

const changes = [];
const skipped = [];

for (const t of trails) {
  const [lng, lat] = t.trailhead_geojson?.coordinates ?? [19.8, 41.3];
  const newRegion = assignRegion(lng, lat);
  if (newRegion !== t.region) {
    changes.push({ slug: t.slug, name: t.name, old: t.region, new: newRegion });
  } else {
    skipped.push(t.slug);
  }
}

// Group summary by new region
const grouped = {};
for (const t of trails) {
  const [lng, lat] = t.trailhead_geojson?.coordinates ?? [19.8, 41.3];
  const r = assignRegion(lng, lat);
  (grouped[r] ??= []).push(t.name);
}

console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN"}\n`);
console.log("── Final region assignment ─────────────────────────────────────");
for (const [region, names] of Object.entries(grouped).sort()) {
  console.log(`\n${region} (${names.length})`);
  names.sort().forEach((n) => console.log(`  · ${n}`));
}

console.log(`\n── Changes: ${changes.length} trails re-labelled, ${skipped.length} already correct ──`);
changes.forEach((c) => console.log(`  ${c.name}\n    ${c.old} → ${c.new}`));

if (!APPLY) {
  console.log("\nDry run. Re-run with --apply to write changes.");
  process.exit(0);
}

console.log("\nWriting…");
let written = 0;
for (const c of changes) {
  const { error: e } = await sb
    .from("trails")
    .update({ region: c.new })
    .eq("slug", c.slug);
  if (e) console.error(`  ${c.slug}: ${e.message}`);
  else written++;
}
console.log(`Done – updated ${written}/${changes.length} trails.`);
