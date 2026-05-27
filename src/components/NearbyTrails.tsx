"use client";

import { useMemo } from "react";
import type { Trail } from "@/lib/types";
import TrailCard from "@/components/TrailCard";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useT, interp } from "@/lib/i18n/context";

const MAX_RESULTS = 15;
const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

function haversineKm(
  [lng1, lat1]: [number, number],
  [lng2, lat2]: [number, number],
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface ScoredTrail { trail: Trail; distanceKm: number; }

export default function NearbyTrails({ trails }: { trails: Trail[] }) {
  const t = useT();
  const { position, error, watching, start } = useGeolocation();

  const nearest = useMemo<ScoredTrail[]>(() => {
    if (!position) return [];
    return trails
      .map((trail) => ({ trail, distanceKm: haversineKm(position, trail.trailhead) }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, MAX_RESULTS);
  }, [trails, position]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={start}
          disabled={watching && !position}
          className="rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: "var(--btn-primary)", color: "var(--btn-primary-text)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--btn-primary-hover)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--btn-primary)"; }}
        >
          {position ? t.updateLocation : t.findNearMe}
        </button>
        {watching && !position && !error && (
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>{t.locating}</span>
        )}
      </div>

      {error && (
        <p
          className="mb-4 rounded-lg border px-3 py-2 text-sm"
          style={{ background: "var(--danger-bg)", borderColor: "var(--danger-border)", color: "var(--danger-text)" }}
        >
          {interp(t.locationError, { error })}
        </p>
      )}

      {!position && !watching && !error && (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t.locationPrompt}</p>
      )}

      {position && (
        <>
          <p className="mb-3 text-xs" style={{ color: "var(--text-muted)" }}>
            {nearest.length === 1
              ? interp(t.nearestTrail, { count: nearest.length })
              : interp(t.nearestTrails, { count: nearest.length })}
          </p>
          <ul className="flex flex-col gap-3">
            {nearest.map(({ trail, distanceKm }) => (
              <li key={trail.slug}>
                <TrailCard trail={trail} distanceKm={distanceKm} />
              </li>
            ))}
            {nearest.length === 0 && (
              <li className="text-sm" style={{ color: "var(--text-muted)" }}>{t.noTrailsAvailable}</li>
            )}
          </ul>
        </>
      )}
    </div>
  );
}
