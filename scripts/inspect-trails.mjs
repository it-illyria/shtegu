import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await sb.from("trails").select("slug,name,region,source,difficulty,distance_km,ascent_m,trailhead_geojson");
if (error) throw error;
console.log("total", data.length);
console.log("curated", data.filter((t) => t.source === "Curated").length);
console.log("non-curated", data.filter((t) => t.source !== "Curated").length);
console.log("TODO region", data.filter((t) => String(t.region).includes("TODO")).length);
console.log("\nsample non-curated:");
for (const t of data.filter((t) => t.source !== "Curated").slice(0, 6)) {
  console.log(JSON.stringify({ slug: t.slug, name: t.name, region: t.region, dist: t.distance_km, asc: t.ascent_m, th: t.trailhead_geojson?.coordinates }));
}
