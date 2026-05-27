import { describe, expect, it } from "vitest";
import { offlineGlyphAssets, PROTOMAPS_ASSETS_HOST } from "./basemap";

describe("offlineGlyphAssets", () => {
  const urls = offlineGlyphAssets();

  it("lists glyph PBFs and sprite assets, all from the Protomaps host", () => {
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every((u) => u.includes(PROTOMAPS_ASSETS_HOST))).toBe(true);
  });

  it("covers the Latin ranges Albanian needs", () => {
    expect(urls.some((u) => u.includes("/0-255.pbf"))).toBe(true);
    expect(urls.some((u) => u.includes("/256-511.pbf"))).toBe(true);
  });

  it("includes the sprite sheet at 1x and 2x", () => {
    expect(urls.some((u) => u.endsWith("/light.png"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/light@2x.png"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/light.json"))).toBe(true);
  });

  it("URL-encodes font stacks (no raw spaces)", () => {
    const glyphs = urls.filter((u) => u.endsWith(".pbf"));
    expect(glyphs.length).toBeGreaterThan(0);
    expect(glyphs.every((u) => !u.includes(" "))).toBe(true);
  });
});
