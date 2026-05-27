import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// If a basemap is hosted off-origin (PMTiles archive or style JSON), allow its
// origin in the CSP automatically so no manual edit is needed when deploying.
function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
const basemapOrigins = [
  originOf(process.env.NEXT_PUBLIC_BASEMAP_PMTILES_URL),
  originOf(process.env.NEXT_PUBLIC_BASEMAP_STYLE_URL),
].filter((o): o is string => Boolean(o));
const extraConnect = basemapOrigins.join(" ");

// Content Security Policy. Sources are scoped to exactly what the app talks to:
//   - Supabase (REST/auth/realtime)        → *.supabase.co + wss
//   - Open-Meteo (weather + elevation)     → api.open-meteo.com
//   - Overpass (POIs)                      → overpass-api.de
//   - Protomaps (map glyphs/sprites)       → protomaps.github.io
//   - OSM raster fallback tiles            → *.tile.openstreetmap.org
//   - Formspree (feedback form)            → formspree.io
//   - PMTiles archive                      → same-origin (/maps) → 'self'
//   - MapLibre web workers + service worker → blob: / 'self'
// 'unsafe-inline' is required for Next's bootstrap + MapLibre/Tailwind inline
// styles (no nonce pipeline here). 'unsafe-eval' is added in dev only (HMR).
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https://*.tile.openstreetmap.org https://protomaps.github.io https://*.opentopomap.org https://*.thunderforest.com https://tile.waymarkedtrails.org`,
  `connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co https://overpass-api.de https://protomaps.github.io https://*.tile.openstreetmap.org https://formspree.io https://*.opentopomap.org https://*.thunderforest.com https://tile.waymarkedtrails.org https://tiles.mapillary.com${extraConnect ? " " + extraConnect : ""}`,
  `worker-src 'self' blob:`,
  `child-src 'self' blob:`,
  `font-src 'self' data:`,
  `manifest-src 'self'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `object-src 'none'`,
  `upgrade-insecure-requests`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // We use the Geolocation API on-trail; everything else is denied.
  {
    key: "Permissions-Policy",
    value: "geolocation=(self), camera=(), microphone=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Service worker must never be served stale — browser needs to detect
      // updates immediately. no-store prevents both browser and CDN caching.
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
