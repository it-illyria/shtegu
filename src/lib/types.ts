// Core domain types for Shtegu.
// `geometry` is a GeoJSON LineString ([lng, lat] pairs) — the order MapLibre and
// PostGIS both expect. Keep that ordering everywhere to avoid lat/lng swaps.

export type Difficulty = "easy" | "moderate" | "hard" | "expert";

export interface Trail {
  slug: string;
  name: string;
  region: string;
  summary: string;
  difficulty: Difficulty;
  distanceKm: number;
  ascentM: number;
  durationHours: number;
  /** [lng, lat] pairs */
  geometry: [number, number][];
  /** Approximate trailhead [lng, lat], usually geometry[0] */
  trailhead: [number, number];
  bestMonths: string;
  /** Logistics notes: transport, guesthouses, permits, water. */
  logistics: string[];
  /** Data provenance, e.g. "OpenStreetMap (ODbL)". Absent for seed data. */
  source?: string;
  /** Albanian overrides for localizable text fields. Falls back to English when absent. */
  sq?: {
    name?: string;
    region?: string;
    summary?: string;
    bestMonths?: string;
    logistics?: string[];
  };
}

export interface Review {
  id: string;
  trailSlug: string;
  author: string;
  rating: number; // 1–5
  body: string;
  createdAt: string; // ISO
}

export type ContributionStatus = "pending" | "approved" | "rejected";

/** A community-submitted NEW trail awaiting moderator review. */
export interface TrailProposal {
  id: string;
  contributorId: string | null;
  contributorName: string;
  status: ContributionStatus;
  notes: string | null;
  name: string;
  nameSq: string | null;
  region: string;
  difficulty: Difficulty;
  summary: string | null;
  distanceKm: number | null;
  ascentM: number | null;
  durationH: number | null;
  bestMonths: string | null;
  logistics: string[] | null;
  routeGeojson: { type: "LineString"; coordinates: [number, number][] } | null;
  createdAt: string;
}

/** A community-submitted correction to a trail, pending moderator review. */
export interface TrailContribution {
  id: string;
  trailSlug: string;
  contributorId: string | null;
  contributorName: string;
  status: ContributionStatus;
  message: string | null;
  // Proposed changes — null means "no change to this field"
  name: string | null;
  nameSq: string | null;
  region: string | null;
  summary: string | null;
  difficulty: Difficulty | null;
  distanceKm: number | null;
  ascentM: number | null;
  durationH: number | null;
  bestMonths: string | null;
  logistics: string[] | null;
  routeGeojson: { type: "LineString"; coordinates: [number, number][] } | null;
  createdAt: string;
}
