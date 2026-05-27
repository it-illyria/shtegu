import { NextRequest, NextResponse } from "next/server";

const OPEN_METEO =
  "https://api.open-meteo.com/v1/forecast" +
  "?current=temperature_2m,weather_code,wind_speed_10m" +
  "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum" +
  "&timezone=auto&forecast_days=7";

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");

  if (!lat || !lng || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const url = `${OPEN_METEO}&latitude=${lat}&longitude=${lng}`;

  try {
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) {
      return NextResponse.json({ error: "upstream error" }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=1800, stale-while-revalidate=3600" },
    });
  } catch {
    return NextResponse.json({ error: "weather unavailable" }, { status: 503 });
  }
}
