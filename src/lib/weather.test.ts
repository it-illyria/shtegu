import { afterEach, describe, expect, it, vi } from "vitest";
import { getTrailheadWeather } from "./weather";

afterEach(() => vi.restoreAllMocks());

const ok = {
  current: { temperature_2m: 18.4, weather_code: 0, wind_speed_10m: 9.1 },
  daily: {
    time: ["2026-05-24", "2026-05-25", "2026-05-26"],
    weather_code: [0, 61, 3],
    temperature_2m_max: [22, 19, 20],
    temperature_2m_min: [11, 10, 12],
    precipitation_sum: [0, 6.2, 1.1],
  },
};

describe("getTrailheadWeather", () => {
  it("parses current + 3-day forecast", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(ok))));
    const w = await getTrailheadWeather([19.93, 41.36]);
    expect(w).not.toBeNull();
    expect(w!.current.temperatureC).toBe(18.4);
    expect(w!.current.code).toBe(0);
    expect(w!.current.label.length).toBeGreaterThan(0);
    expect(w!.daily).toHaveLength(3);
    expect(w!.daily[1].precipMm).toBe(6.2);
    expect(w!.daily[1].maxC).toBe(19);
  });

  it("sends latitude/longitude in the right order", async () => {
    const spy = vi.fn(async () => new Response(JSON.stringify(ok)));
    vi.stubGlobal("fetch", spy);
    await getTrailheadWeather([19.93, 41.36]); // [lng, lat]
    const url = String(spy.mock.calls[0][0]);
    expect(url).toContain("lat=41.36");
    expect(url).toContain("lng=19.93");
  });

  it("returns null on HTTP error and on malformed payload", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x", { status: 503 })));
    expect(await getTrailheadWeather([19.93, 41.36])).toBeNull();

    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ current: null }))));
    expect(await getTrailheadWeather([19.93, 41.36])).toBeNull();
  });
});
