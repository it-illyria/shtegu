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
}

function rowToTrail(r: TrailRow): Trail {
  const distanceKm = Number(r.distance_km);
  const terrain = terrainFromRegion(r.region);
  return {
    slug: r.slug,
    name: r.name,
    region: r.region,
    summary: r.summary,
    difficulty: r.difficulty,
    distanceKm,
    ascentM: r.ascent_m,
    durationHours: Number(r.duration_h),
    bestMonths: r.best_months ?? "",
    logistics: r.logistics ?? [],
    source: r.source ?? undefined,
    geometry: r.route_geojson.coordinates,
    trailhead: r.trailhead_geojson.coordinates,
    sq: {
      name: r.name_sq ?? undefined,
      region: REGION_SQ[r.region],
      summary: deriveSummarySq(distanceKm, r.ascent_m, r.region, r.difficulty),
      bestMonths: r.best_months ? translateBestMonths(r.best_months) : undefined,
      logistics: deriveLogisticsSq(terrain),
    },
  };
}

// name_sq requires migration 0004_name_sq.sql — add it back once that column exists.
const COLUMNS =
  "slug,name,region,summary,difficulty,distance_km,ascent_m,duration_h,best_months,logistics,source,route_geojson,trailhead_geojson";

export async function getTrails(): Promise<Trail[]> {
  if (!isSupabaseConfigured || !supabase) return seedTrails;
  const { data, error } = await supabase
    .from("trails")
    .select(COLUMNS)
    .order("name");
  if (error || !data) {
    console.error("getTrails fell back to seed:", error?.message);
    return seedTrails;
  }
  return (data as unknown as TrailRow[]).map(rowToTrail);
}

export async function getTrail(slug: string): Promise<Trail | undefined> {
  if (!isSupabaseConfigured || !supabase) return getSeedTrail(slug);
  const { data, error } = await supabase
    .from("trails")
    .select(COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("getTrail fell back to seed:", error.message);
    return getSeedTrail(slug);
  }
  return rowToTrail(data as unknown as TrailRow);
}

/** Trails near a [lng, lat] point, nearest first. Seed mode returns all. */
export async function getTrailsNearby(
  lng: number,
  lat: number,
  radiusM = 50000,
): Promise<Trail[]> {
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
}
