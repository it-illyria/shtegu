import { afterEach, describe, expect, it, vi } from "vitest";
import { buildElevationProfile } from "./elevation";

afterEach(() => vi.restoreAllMocks());

// A short south→north route near Tirana ([lng, lat]). The lib samples and
// queries an elevation API; we stub fetch so the math is deterministic.
const route: [number, number][] = [
  [19.8, 41.3],
  [19.8, 41.4],
  [19.8, 41.5],
];

function mockElevations(elevation: number[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ elevation }))),
  );
}

describe("buildElevationProfile", () => {
  it("returns null for a degenerate route", async () => {
    expect(await buildElevationProfile([])).toBeNull();
    expect(await buildElevationProfile([[19.8, 41.3]])).toBeNull();
  });

  it("returns null when the API fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    expect(await buildElevationProfile(route)).toBeNull();
  });

  it("returns null when elevation count mismatches the sample count", async () => {
    mockElevations([100, 200]); // too few vs. the 64 sampled points
    expect(await buildElevationProfile(route)).toBeNull();
  });

  it("computes ascent as the sum of positive deltas only", async () => {
    // Routes shorter than the sample count (64) are used as-is, so a 5-point
    // route yields 5 elevation points — match the mock to that.
    const fivePoint: [number, number][] = [
      [19.8, 41.30],
      [19.8, 41.35],
      [19.8, 41.40],
      [19.8, 41.45],
      [19.8, 41.50],
    ];
    // up +150, down -50, up +200, down -50  →  ascent = 350
    mockElevations([100, 250, 200, 400, 350]);

    const profile = await buildElevationProfile(fivePoint);
    expect(profile).not.toBeNull();
    expect(profile!.points).toHaveLength(5);
    expect(profile!.totalAscentM).toBeCloseTo(350, 0);
    expect(profile!.minM).toBe(100);
    expect(profile!.maxM).toBe(400);
    expect(profile!.totalDistanceKm).toBeGreaterThan(0);
    expect(profile!.points[0].distanceKm).toBe(0);
  });
});
