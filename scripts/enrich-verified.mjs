// Enrich select trails with VERIFIED detail from published hiking guides, and add
// iconic trails that were missing from the OSM import. Sources: thesandyfeet.com,
// theholisticbackpacker.com, albaniavisit.com, zbulo.org, 43bluedoors.com.
//
//   node --env-file=.env.local scripts/enrich-verified.mjs          # dry run
//   node --env-file=.env.local scripts/enrich-verified.mjs --apply  # write
//
// Honesty notes: added trails use APPROXIMATE hand-placed geometry (labelled in
// `source`) — fine for discovery/planning, not navigation. We do not invent bus
// times or guesthouse names beyond what the cited guides state generally.

// ---- Updates to existing trails (by slug) --------------------------------
const UPDATES = {
  "theth-valbona": {
    best_months: "June – September",
    logistics: [
      "Furgon (minibus) Shkodër → Theth daily in season (~3 h on the now-paved road, ~€10).",
      "Alternative: reach Valbona via the Koman Lake ferry from Fierza (~€26 incl. transfers) — a scenic trip in itself.",
      "Family-run guesthouses with half-board in both Theth and Valbona; book ahead in summer.",
      "Hikeable in either direction (~1,150 m ascent from the Theth side). Carry 2 L water — the pass is exposed.",
    ],
  },
  "7-the-blue-eye": {
    summary:
      "A marked trail to the Theth Blue Eye (Syri i Kaltër i Thethit), a vivid ice-cold spring pool in the Albanian Alps. Extremely popular — expect crowds at midday in peak season.",
    best_months: "June – September",
    logistics: [
      "Starts from central Theth; a shorter version is possible with a 4x4 transfer to the upper trailhead.",
      "Guesthouses can arrange packed lunches; go early to beat the heat and crowds.",
      "The water is glacially cold — swimming is brief at best.",
    ],
  },
  "maja-rosit": {
    summary:
      "A marked route toward Maja Rosit from the Valbona side, climbing into the Accursed Mountains near the Montenegro (Prokletije) border — known for July wildflower meadows and few other hikers.",
  },
  "maja-e-jezerces": {
    summary:
      "A mapped section of the approach toward Maja e Jezercës (2,694 m), the highest peak of the Albanian Alps. The full summit is a demanding, chain-assisted scramble for experienced hikers only.",
  },
  "llogara-circle": {
    best_months: "April – November",
    summary:
      "A pine-forest loop in Llogara National Park high above the Ionian coast, with panoramic Riviera and sea views.",
  },
};

// ---- New curated trails (approximate geometry) ---------------------------
function mk(slug, name, region, summary, difficulty, km, ascent, hours, months, line, logistics) {
  return {
    slug, name, region, summary, difficulty,
    distance_km: km, ascent_m: ascent, duration_h: hours, best_months: months,
    logistics,
    source: "Curated (approx. route — verify locally)",
    route_geojson: { type: "LineString", coordinates: line },
    trailhead_geojson: { type: "Point", coordinates: line[0] },
  };
}

const NEW_TRAILS = [
  mk(
    "bovilla-gamti",
    "Bovilla Lake & Mount Gamti",
    "Central Albania / near Tirana",
    "A popular day hike from near Tirana to the Mount Gamti ridge, ending at a dramatic clifftop panorama over the turquoise Bovilla reservoir.",
    "moderate", 13.2, 958, 5.5, "April – November",
    [[19.8030, 41.4300], [19.8052, 41.4250], [19.8078, 41.4205], [19.8096, 41.4174]],
    [
      "Drive or taxi from Tirana to the Bovilla / Zall-Bastar area (~1 h); no public transport to the trailhead.",
      "Steep final climb to the cliff viewpoint — sturdy shoes recommended.",
      "No facilities on the trail; bring water and snacks.",
    ],
  ),
  mk(
    "syri-i-kalter-saranda",
    "Syri i Kaltër (Blue Eye of Saranda)",
    "Sarandë / Ionian (south)",
    "A short, easy walk to the Blue Eye — a deep, vivid-blue karst spring near Sarandë and one of southern Albania's most famous natural sights.",
    "easy", 1.5, 30, 0.5, "Year-round (busiest in summer)",
    [[20.1805, 39.9260], [20.1840, 39.9258], [20.1875, 39.9253]],
    [
      "Off the SH99 between Sarandë and Gjirokastër; buses can drop you at the junction (~2 km walk in).",
      "Small entrance fee; very crowded midday — go early.",
      "Swimming in the spring is not permitted.",
    ],
  ),
  mk(
    "grunas-waterfall-theth",
    "Grunas Waterfall, Theth",
    "Albanian Alps (Accursed Mountains)",
    "A short, family-friendly walk from Theth village to the Grunas Waterfall and the rim of the Grunas Canyon.",
    "easy", 4, 293, 1.5, "May – October",
    [[19.7717, 42.3936], [19.7700, 42.3870], [19.7670, 42.3805], [19.7655, 42.3785]],
    [
      "Starts in central Theth near the church / Reconciliation Tower.",
      "Often combined with the Theth Blue Eye in one day.",
      "Canyon-edge sections — keep children close.",
    ],
  ),
];

async function main() {
  const apply = process.argv.includes("--apply");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(url, key);

  console.log(`Updates: ${Object.keys(UPDATES).length} existing trails`);
  for (const [slug, patch] of Object.entries(UPDATES))
    console.log(`  ~ ${slug}: ${Object.keys(patch).join(", ")}`);
  console.log(`New trails: ${NEW_TRAILS.length}`);
  NEW_TRAILS.forEach((t) => console.log(`  + ${t.slug} (${t.name}, ${t.distance_km} km, ${t.difficulty})`));

  if (!apply) return console.log("\nDry run. Re-run with --apply to write.");

  for (const [slug, patch] of Object.entries(UPDATES)) {
    const { error } = await sb.from("trails").update(patch).eq("slug", slug);
    if (error) console.error(`  update ${slug}: ${error.message}`);
  }
  const { error: insErr } = await sb.from("trails").upsert(NEW_TRAILS, { onConflict: "slug" });
  if (insErr) console.error("  insert error:", insErr.message);

  const { count } = await sb.from("trails").select("*", { count: "exact", head: true });
  console.log(`\nDone. Trails in Supabase: ${count}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
