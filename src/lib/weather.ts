// Trailhead weather via the Open-Meteo forecast API.
// No API key, CORS-enabled, so it can be called straight from the browser.
// Coordinates follow the project convention: [lng, lat].

export interface WeatherCurrent {
  temperatureC: number;
  windKph: number;
  code: number;
  label: string;
  labelSq: string;
  emoji: string;
}

export interface WeatherDay {
  /** ISO date, e.g. "2026-05-24" */
  date: string;
  code: number;
  label: string;
  labelSq: string;
  emoji: string;
  maxC: number;
  minC: number;
  precipMm: number;
}

export interface TrailheadWeather {
  current: WeatherCurrent;
  daily: WeatherDay[];
}

/** WMO weather interpretation codes → short label + Albanian label + emoji. */
const WMO: Record<number, { label: string; labelSq: string; emoji: string }> = {
  0:  { label: "Clear",            labelSq: "E kthjellët",              emoji: "☀️" },
  1:  { label: "Mainly clear",     labelSq: "Kryesisht e kthjellët",    emoji: "🌤️" },
  2:  { label: "Partly cloudy",    labelSq: "Pjesërisht me re",         emoji: "⛅" },
  3:  { label: "Overcast",         labelSq: "Me re",                    emoji: "☁️" },
  45: { label: "Fog",              labelSq: "Mjegull",                  emoji: "🌫️" },
  48: { label: "Rime fog",         labelSq: "Mjegull me akull",         emoji: "🌫️" },
  51: { label: "Light drizzle",    labelSq: "Vesë e lehtë",             emoji: "🌦️" },
  53: { label: "Drizzle",          labelSq: "Vesë",                     emoji: "🌦️" },
  55: { label: "Heavy drizzle",    labelSq: "Vesë e dendur",            emoji: "🌧️" },
  56: { label: "Freezing drizzle", labelSq: "Vesë ngrirëse",            emoji: "🌧️" },
  57: { label: "Freezing drizzle", labelSq: "Vesë ngrirëse",            emoji: "🌧️" },
  61: { label: "Light rain",       labelSq: "Shi i lehtë",              emoji: "🌦️" },
  63: { label: "Rain",             labelSq: "Shi",                      emoji: "🌧️" },
  65: { label: "Heavy rain",       labelSq: "Shi i dendur",             emoji: "🌧️" },
  66: { label: "Freezing rain",    labelSq: "Shi ngrirës",              emoji: "🌧️" },
  67: { label: "Freezing rain",    labelSq: "Shi ngrirës",              emoji: "🌧️" },
  71: { label: "Light snow",       labelSq: "Borë e lehtë",             emoji: "🌨️" },
  73: { label: "Snow",             labelSq: "Borë",                     emoji: "🌨️" },
  75: { label: "Heavy snow",       labelSq: "Borë e dendur",            emoji: "❄️" },
  77: { label: "Snow grains",      labelSq: "Kokrra bore",              emoji: "🌨️" },
  80: { label: "Light showers",    labelSq: "Shirata të lehta",         emoji: "🌦️" },
  81: { label: "Showers",          labelSq: "Shirata",                  emoji: "🌧️" },
  82: { label: "Violent showers",  labelSq: "Shirata të forta",         emoji: "⛈️" },
  85: { label: "Snow showers",     labelSq: "Breshër bore",             emoji: "🌨️" },
  86: { label: "Snow showers",     labelSq: "Breshër bore",             emoji: "❄️" },
  95: { label: "Thunderstorm",     labelSq: "Stuhi",                    emoji: "⛈️" },
  96: { label: "Thunderstorm",     labelSq: "Stuhi",                    emoji: "⛈️" },
  99: { label: "Thunderstorm",     labelSq: "Stuhi",                    emoji: "⛈️" },
};

function describe(code: number): { label: string; labelSq: string; emoji: string } {
  return WMO[code] ?? { label: "Unknown", labelSq: "E panjohur", emoji: "❓" };
}

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
  };
}

/**
 * Fetch a compact 3-day forecast for a trailhead.
 * @param trailhead [lng, lat]
 * @returns typed weather, or null on any failure.
 */
export async function getTrailheadWeather(
  trailhead: [number, number],
  signal?: AbortSignal,
): Promise<TrailheadWeather | null> {
  const [lng, lat] = trailhead;

  const url = `/api/weather?lat=${lat}&lng=${lng}`;

  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;

    const data = (await res.json()) as OpenMeteoResponse;
    const c = data.current;
    const d = data.daily;
    if (
      !c ||
      typeof c.temperature_2m !== "number" ||
      typeof c.weather_code !== "number" ||
      typeof c.wind_speed_10m !== "number" ||
      !d ||
      !d.time ||
      !d.weather_code ||
      !d.temperature_2m_max ||
      !d.temperature_2m_min ||
      !d.precipitation_sum
    ) {
      return null;
    }

    const currentMeta = describe(c.weather_code);
    const current: WeatherCurrent = {
      temperatureC: c.temperature_2m,
      windKph: c.wind_speed_10m,
      code: c.weather_code,
      label: currentMeta.label,
      labelSq: currentMeta.labelSq,
      emoji: currentMeta.emoji,
    };

    const daily: WeatherDay[] = d.time.map((date, i) => {
      const code = d.weather_code![i] ?? 0;
      const meta = describe(code);
      return {
        date,
        code,
        label: meta.label,
        labelSq: meta.labelSq,
        emoji: meta.emoji,
        maxC: d.temperature_2m_max![i] ?? 0,
        minC: d.temperature_2m_min![i] ?? 0,
        precipMm: d.precipitation_sum![i] ?? 0,
      };
    });

    return { current, daily };
  } catch {
    return null;
  }
}
