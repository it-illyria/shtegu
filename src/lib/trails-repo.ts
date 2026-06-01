import { cache } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { trails as seedTrails, getTrail as getSeedTrail } from "@/data/trails";
import type { Trail } from "@/lib/types";

// Single source of truth for reading trails. Uses Supabase when configured,
// otherwise falls back to local seed data so the app always renders.

// ---- Albanian derivation for OSM-imported trails ----------------------------

function terrainFromRegion(region: string): "alpine" | "coastal" | "inland" {
  if (/Alps|Accursed|Dibër|Korab|Kukës/i.test(region)) return "alpine";
  if (/Riviera|Ionian|Adriatic/i.test(region)) return "coastal";
  return "inland";
}

const REGION_SQ: Record<string, string> = {
  "Albanian Alps (Accursed Mountains)": "Alpet Shqiptare (Bjeshkët e Namuna)",
  "Ionian/Adriatic Riviera": "Riviera Joniane/Adriatike",
  "Ionian Riviera": "Riviera Joniane",
  "Dibër / Korab": "Dibër / Korab",
  "Korçë / Përmet region": "Rajoni i Korçës / Përmetit",
  "Central Albania / near Tirana": "Shqipëria Qendrore / pranë Tiranës",
  "Llogara National Park, Riviera": "Parku Kombëtar i Llogarasë, Riviera",
  "Dajti National Park, near Tirana": "Parku Kombëtar i Dajtit, pranë Tiranës",
  "Erzen Canyon, near Tirana": "Gryka e Erzenit, pranë Tiranës",
  "Sarandë / Ionian (south)": "Sarandë / Jonian (jug)",
  "Kukës / Korab-Koritnik": "Kukës / Korab-Koritnik",
  "Kukës / Koritnik": "Kukës / Koritnik",
  "Kukës / Gjallica": "Kukës / Gjallica",
  "Kukës / Bicaj": "Kukës / Bicaj",
  "Has / Kukës": "Has / Kukës",
};

const MONTH_SQ: Record<string, string> = {
  January: "Janar", February: "Shkurt", March: "Mars",
  April: "Prill", May: "Maj", June: "Qershor",
  July: "Korrik", August: "Gusht", September: "Shtator",
  October: "Tetor", November: "Nëntor", December: "Dhjetor",
  "Year-round": "Gjatë gjithë vitit",
  "snow possible": "borë e mundshme",
  "busiest in summer": "më i vizituar në verë",
};

function translateBestMonths(months: string): string {
  if (!months || months === "TODO") return "";
  let s = months;
  for (const [en, sq] of Object.entries(MONTH_SQ)) {
    s = s.replaceAll(en, sq);
  }
  return s;
}

const DIFFICULTY_SQ: Record<string, string> = {
  easy: "e lehtë",
  moderate: "mesatare",
  hard: "e vështirë",
  expert: "ekspert",
};

function deriveSummarySq(
  distanceKm: number,
  ascentM: number,
  region: string,
  difficulty: string,
): string {
  const regionSq = REGION_SQ[region] ?? region;
  const diffSq = DIFFICULTY_SQ[difficulty] ?? difficulty;
  const asc = ascentM > 0 ? ` me rreth ${Math.round(ascentM / 10) * 10} m ngjitje` : "";
  return `Një shteg hiking ${distanceKm} km me vështirësi ${diffSq} në ${regionSq}${asc}, i hartografuar nga të dhënat e OpenStreetMap.`;
}

function deriveLogisticsSq(terrain: "alpine" | "coastal" | "inland"): string[] {
  const base = [
    "I arritshëm nga qyteti ose fshati më i afërt; kontrolloni transportin lokal para nisjes.",
    "Të dhënat e rrugës nga OpenStreetMap (ODbL); verifikoni kushtet aktuale dhe sinjalistikën lokalisht.",
  ];
  if (terrain === "alpine")
    base.push("Terren malor — mbani shtresa të ngrohta, ujë të mjaftueshëm dhe hartë; moti mund të ndryshojë shpejt.");
  else if (terrain === "coastal")
    base.push("Terren bregdetar i ekspozuar — mbani ujë të mjaftueshëm dhe mbrojtje nga dielli; burimet mund të jenë të pabesueshme.");
  else
    base.push("Mbani ujë të mjaftueshëm — burimet natyrore mund të jenë të pabesueshme.");
  return base;
}

interface TrailRow {
  slug: string;
  name: string;
  name_sq?: string | null;
  region: string;
  summary: string;
  difficulty: Trail["difficulty"];
  distance_km: number;
  ascent_m: number;
  duration_h: number;
  best_months: string | null;
  logistics: string[];
  source: string | null;
  route_geojson: { coordinates: [number, number][] };
  trailhead_geojson: { coordinates: [number, number] };
  cover_image_url?: string | null;
}

function deriveBestMonths(terrain: "alpine" | "coastal" | "inland"): string {
  if (terrain === "alpine") return "June–September (snow possible outside)";
  if (terrain === "coastal") return "March–November";
  return "April–October";
}

function isPlaceholderMonths(s: string | null | undefined): boolean {
  return !s || /^todo$/i.test(s.trim());
}

function rowToTrail(r: TrailRow): Trail {
  const distanceKm = Number(r.distance_km);
  const terrain = terrainFromRegion(r.region);
  const bestMonths = isPlaceholderMonths(r.best_months)
    ? deriveBestMonths(terrain)
    : (r.best_months as string);
  return {
    slug: r.slug,
    name: r.name,
    region: r.region,
    summary: r.summary,
    difficulty: r.difficulty,
    distanceKm,
    ascentM: r.ascent_m,
    durationHours: Number(r.duration_h),
    bestMonths,
    logistics: r.logistics ?? [],
    source: r.source ?? undefined,
    geometry: r.route_geojson.coordinates,
    trailhead: r.trailhead_geojson.coordinates,
    coverImageUrl: resolveCoverUrl(r.cover_image_url),
    sq: {
      name: r.name_sq ?? undefined,
      region: REGION_SQ[r.region],
      summary: deriveSummarySq(distanceKm, r.ascent_m, r.region, r.difficulty),
      bestMonths: translateBestMonths(bestMonths),
      logistics: deriveLogisticsSq(terrain),
    },
  };
}

// name_sq requires migration 0004_name_sq.sql — add it back once that column exists.
const COLUMNS_BASE =
  "slug,name,region,summary,difficulty,distance_km,ascent_m,duration_h,best_months,logistics,source,route_geojson,trailhead_geojson";
// cover_image_url comes from migration 0013_trail_cover.sql — when that hasn't
// been applied yet, the query falls back to COLUMNS_BASE so the app still works.
const COLUMNS = `${COLUMNS_BASE},cover_image_url`;

const COVER_BUCKET = "trail-photos";

/** Resolve a cover_path (from the trail_covers view) into a fully-qualified URL.
 * - Already-absolute http(s) URL → returned as-is.
 * - Storage path (e.g. "albanian-alps/foo.jpg") → public URL from the bucket. */
function resolveCoverUrl(coverPath: string | null | undefined): string | undefined {
  if (!coverPath) return undefined;
  if (/^https?:\/\//i.test(coverPath)) return coverPath;
  if (!supabase) return undefined;
  return supabase.storage.from(COVER_BUCKET).getPublicUrl(coverPath).data.publicUrl;
}

/** Fetch cover paths from the trail_covers view (explicit url + community fallback)
 * for the given slugs. Resolves to a slug → public URL map. */
async function fetchCovers(slugs: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!isSupabaseConfigured || !supabase || slugs.length === 0) return out;
  // Try the view first (migration 0013). If absent, fall back to a direct
  // trail_photos query so community covers still work pre-migration.
  const view = await supabase
    .from("trail_covers")
    .select("slug,cover_path")
    .in("slug", slugs);
  if (!view.error && view.data) {
    for (const r of view.data as { slug: string; cover_path: string | null }[]) {
      const url = resolveCoverUrl(r.cover_path);
      if (url) out.set(r.slug, url);
    }
    return out;
  }
  // View missing — query trail_photos directly.
  const photos = await supabase
    .from("trail_photos")
    .select("trail_slug,storage_path,created_at")
    .in("trail_slug", slugs)
    .order("created_at", { ascending: false });
  if (photos.error || !photos.data) return out;
  for (const r of photos.data as { trail_slug: string; storage_path: string }[]) {
    if (out.has(r.trail_slug)) continue; // first (newest) per slug only
    const url = resolveCoverUrl(r.storage_path);
    if (url) out.set(r.trail_slug, url);
  }
  return out;
}

// Wrapped in React `cache()` so multiple calls within a single server render
// are deduped (e.g. `generateMetadata` + page body both calling `getTrail`).

async function fetchTrailRows(): Promise<TrailRow[] | null> {
  if (!supabase) return null;
  // Try the full column set first; if cover_image_url is missing, retry without it.
  const full = await supabase.from("trails").select(COLUMNS).order("name");
  if (!full.error && full.data) return full.data as unknown as TrailRow[];
  if (full.error && /cover_image_url/i.test(full.error.message)) {
    const base = await supabase.from("trails").select(COLUMNS_BASE).order("name");
    if (!base.error && base.data) return base.data as unknown as TrailRow[];
  }
  console.error("getTrails fell back to seed:", full.error?.message);
  return null;
}

export const getTrails = cache(async (): Promise<Trail[]> => {
  if (!isSupabaseConfigured || !supabase) return seedTrails;
  const rows = await fetchTrailRows();
  if (!rows) return seedTrails;
  const trails = rows.map(rowToTrail);
  // Enrich with community-photo fallback for trails that have no explicit cover.
  const needFallback = trails.filter((t) => !t.coverImageUrl).map((t) => t.slug);
  if (needFallback.length > 0) {
    const covers = await fetchCovers(needFallback);
    return trails.map((t) =>
      t.coverImageUrl ? t : { ...t, coverImageUrl: covers.get(t.slug) },
    );
  }
  return trails;
});

async function fetchTrailRow(slug: string): Promise<TrailRow | null> {
  if (!supabase) return null;
  const full = await supabase.from("trails").select(COLUMNS).eq("slug", slug).maybeSingle();
  if (!full.error && full.data) return full.data as unknown as TrailRow;
  if (full.error && /cover_image_url/i.test(full.error.message)) {
    const base = await supabase.from("trails").select(COLUMNS_BASE).eq("slug", slug).maybeSingle();
    if (!base.error && base.data) return base.data as unknown as TrailRow;
  }
  if (full.error) console.error("getTrail fell back to seed:", full.error.message);
  return null;
}

export const getTrail = cache(async (slug: string): Promise<Trail | undefined> => {
  if (!isSupabaseConfigured || !supabase) return getSeedTrail(slug);
  const row = await fetchTrailRow(slug);
  if (!row) return getSeedTrail(slug);
  const trail = rowToTrail(row);
  if (!trail.coverImageUrl) {
    const covers = await fetchCovers([slug]);
    const fallback = covers.get(slug);
    if (fallback) trail.coverImageUrl = fallback;
  }
  return trail;
});

/** Trails near a [lng, lat] point, nearest first. Seed mode returns all. */
export const getTrailsNearby = cache(async (
  lng: number,
  lat: number,
  radiusM = 50000,
): Promise<Trail[]> => {
  if (!isSupabaseConfigured || !supabase) return seedTrails;
  const { data, error } = await supabase.rpc("trails_nearby", {
    lng,
    lat,
    radius_m: radiusM,
  });
  if (error || !data) {
    console.error("getTrailsNearby fell back to seed:", error?.message);
    return seedTrails;
  }
  return (data as unknown as TrailRow[]).map(rowToTrail);
});
