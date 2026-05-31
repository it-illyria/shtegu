import { NextRequest, NextResponse } from "next/server";

// Hard cap matches SAMPLE_COUNT in src/lib/elevation.ts (the only legitimate caller).
const MAX_POINTS = 64;

// Use the full world bounds rather than Albania-only bounds: this endpoint is a
// general elevation proxy and may be reused for non-Albania routes (e.g. GPX
// imports of trips abroad). The hard MAX_POINTS cap is what blocks DoS, not the
// geographic window.
const LAT_MIN = -90;
const LAT_MAX = 90;
const LNG_MIN = -180;
const LNG_MAX = 180;

function parseCoordList(raw: string, min: number, max: number): number[] | null {
  const parts = raw.split(",");
  if (parts.length === 0 || parts.length > MAX_POINTS) return null;
  const out: number[] = new Array(parts.length);
  for (let i = 0; i < parts.length; i++) {
    const n = Number(parts[i]);
    if (!Number.isFinite(n)) return null;
    if (n < min || n > max) return null;
    out[i] = n;
  }
  return out;
}

export async function GET(request: NextRequest) {
  const latRaw = request.nextUrl.searchParams.get("lat");
  const lngRaw = request.nextUrl.searchParams.get("lng");

  if (!latRaw || !lngRaw) {
    return NextResponse.json({ error: "invalid coordinates" }, { status: 400 });
  }

  const lats = parseCoordList(latRaw, LAT_MIN, LAT_MAX);
  const lngs = parseCoordList(lngRaw, LNG_MIN, LNG_MAX);

  if (!lats || !lngs || lats.length !== lngs.length) {
    return NextResponse.json({ error: "invalid coordinates" }, { status: 400 });
  }

  // Re-serialize from validated numbers only. .toFixed(6) canonicalizes the
  // upstream URL so identical routes share a cache entry.
  const params = new URLSearchParams();
  params.set("latitude", lats.map((n) => n.toFixed(6)).join(","));
  params.set("longitude", lngs.map((n) => n.toFixed(6)).join(","));
  const url = `https://api.open-meteo.com/v1/elevation?${params.toString()}`;

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } }); // elevation doesn't change — cache 24h
    if (!res.ok) {
      return NextResponse.json({ error: "upstream error" }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
    });
  } catch {
    return NextResponse.json({ error: "elevation unavailable" }, { status: 503 });
  }
}
