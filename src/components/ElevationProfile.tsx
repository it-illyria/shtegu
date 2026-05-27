"use client";

import { useEffect, useState } from "react";
import { buildElevationProfile, type ElevationProfile as Profile } from "@/lib/elevation";
import { useT, interp } from "@/lib/i18n/context";

const VIEW_W = 600;
const VIEW_H = 200;
const PAD_LEFT = 44;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 28;
const PLOT_W = VIEW_W - PAD_LEFT - PAD_RIGHT;
const PLOT_H = VIEW_H - PAD_TOP - PAD_BOTTOM;

export default function ElevationProfile({ geometry }: { geometry: [number, number][] }) {
  const t = useT();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    buildElevationProfile(geometry, controller.signal)
      .then((result) => { if (!controller.signal.aborted) { setProfile(result); setLoading(false); } })
      .catch(() => { if (!controller.signal.aborted) { setProfile(null); setLoading(false); } });
    return () => controller.abort();
  }, [geometry]);

  if (loading || !profile || profile.points.length < 2) {
    return (
      <div
        className="grid h-44 place-items-center rounded-xl border text-sm"
        style={{
          borderColor: "var(--card-border)",
          background: "var(--surface-inset)",
          color: "var(--text-muted)",
        }}
      >
        {loading ? t.loadingElevation : t.elevationUnavailable}
      </div>
    );
  }

  const { points, minM, maxM, totalAscentM, totalDistanceKm } = profile;

  const range = Math.max(1, maxM - minM);
  const yPad = range * 0.08;
  const lo = minM - yPad;
  const hi = maxM + yPad;
  const span = hi - lo;

  const x = (km: number) => PAD_LEFT + (totalDistanceKm > 0 ? (km / totalDistanceKm) * PLOT_W : 0);
  const y = (m: number) => PAD_TOP + (1 - (m - lo) / span) * PLOT_H;

  const linePoints = points.map((p) => `${x(p.distanceKm)},${y(p.elevationM)}`);
  const areaPath =
    `M ${PAD_LEFT},${PAD_TOP + PLOT_H} ` +
    `L ${linePoints.join(" L ")} ` +
    `L ${PAD_LEFT + PLOT_W},${PAD_TOP + PLOT_H} Z`;
  const linePath = `M ${linePoints.join(" L ")}`;
  const yTicks = [minM, (minM + maxM) / 2, maxM];

  return (
    <figure
      className="rounded-xl border p-3"
      style={{ borderColor: "var(--card-border)" }}
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        role="img"
        aria-label={t.elevationAria}
        className="block h-auto w-full"
      >
        <defs>
          <linearGradient id="elev-fill" x1="0" y1="0" x2="0" y2="1">
            {/* Uses currentColor so the gradient inherits from CSS var */}
            <stop offset="0%" stopColor="var(--chart-line)" stopOpacity="0.30" />
            <stop offset="100%" stopColor="var(--chart-line)" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {yTicks.map((m, i) => (
          <g key={i}>
            <line
              x1={PAD_LEFT} x2={PAD_LEFT + PLOT_W}
              y1={y(m)} y2={y(m)}
              stroke="currentColor" strokeOpacity={0.1} strokeWidth={1}
            />
            <text
              x={PAD_LEFT - 6} y={y(m)}
              textAnchor="end" dominantBaseline="middle"
              fontSize={11} fill="currentColor" fillOpacity={0.55}
            >
              {Math.round(m)}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="url(#elev-fill)" />
        <path
          d={linePath} fill="none"
          stroke="var(--chart-line)" strokeWidth={2}
          strokeLinejoin="round" strokeLinecap="round"
        />

        <text x={PAD_LEFT} y={VIEW_H - 8} textAnchor="start" fontSize={11} fill="currentColor" fillOpacity={0.55}>
          {t.elevationStartKm}
        </text>
        <text x={PAD_LEFT + PLOT_W} y={VIEW_H - 8} textAnchor="end" fontSize={11} fill="currentColor" fillOpacity={0.55}>
          {interp(t.elevationEndKm, { km: totalDistanceKm.toFixed(1) })}
        </text>
        <text x={PAD_LEFT - 6} y={PAD_TOP - 2} textAnchor="end" fontSize={10} fill="currentColor" fillOpacity={0.45}>
          {t.elevationUnitM}
        </text>
      </svg>

      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
        <span>{interp(t.elevationMin, { m: Math.round(minM) })}</span>
        <span>{interp(t.elevationMax, { m: Math.round(maxM) })}</span>
        <span>{interp(t.elevationTotalAscent, { m: Math.round(totalAscentM) })}</span>
      </figcaption>
    </figure>
  );
}
