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

// Supabase project origin (e.g. https://xxx.supabase.co). Photos uploaded to
// the public `trail-photos` bucket are served from this origin, so it must be
// allowed in img-src. Computed at build time from NEXT_PUBLIC_SUPABASE_URL.
const supabaseOrigin = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL) || "";

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
// Shared CSP directives. `blob:` in connect-src is required because MapLibre
// and the PMTiles protocol shim fetch blob: URLs internally (decompressed
// tile bytes are passed between the worker and main thread as blob URLs that
// are then re-fetched). Mapillary host is kept — it's the source of the
// optional "Street Photos" overlay (vector tiles fetched via connect-src,
// gated by NEXT_PUBLIC_MAPILLARY_ACCESS_TOKEN at runtime).
const cspBase = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob:${supabaseOrigin ? " " + supabaseOrigin : ""} https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://protomaps.github.io https://*.opentopomap.org https://*.thunderforest.com https://tile.waymarkedtrails.org`,
  `connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co https://overpass-api.de https://protomaps.github.io https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://formspree.io https://*.opentopomap.org https://*.thunderforest.com https://tile.waymarkedtrails.org https://tiles.mapillary.com https://va.vercel-scripts.com https://vitals.vercel-insights.com${extraConnect ? " " + extraConnect : ""}`,
  `worker-src 'self' blob:`,
  `child-src 'self' blob:`,
  `font-src 'self' data:`,
  `manifest-src 'self'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `object-src 'none'`,
  `upgrade-insecure-requests`,
];

// Enforced CSP: includes modern `report-to` for violation reporting.
const csp = [...cspBase, `report-to csp-endpoint`].join("; ");

// Report-Only CSP: same policy + legacy `report-uri` (still required by
// Chrome/Firefox for CSP violation reports) + Trusted Types in report-only.
// MapLibre uses setHTML internally for popups, so we observe — not enforce —
// require-trusted-types-for to surface violations without breaking the map.
const cspReportOnly = [
  ...cspBase,
  `report-uri /api/csp-report`,
  `report-to csp-endpoint`,
  `require-trusted-types-for 'script'`,
  `trusted-types default 'allow-duplicates'`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
  // Modern Reporting API endpoint group referenced by `report-to` above.
  {
    key: "Reporting-Endpoints",
    value: `csp-endpoint="/api/csp-report"`,
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Cross-origin isolation. The app's sensitive flows (auth, activity log)
  // are entirely same-origin, so COOP/CORP can be applied unconditionally.
  // -- Cross-Origin-Embedder-Policy is intentionally OMITTED: requiring it
  //    would force every cross-origin resource (OSM/Thunderforest/Mapillary
  //    tiles, Protomaps glyphs) to opt in via CORP, which they do not, and
  //    it also breaks the MapLibre WebGL canvas (cross-origin image data).
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  // We use the Geolocation API on-trail; every other powerful feature is
  // denied so a compromised dependency can't silently request them.
  {
    key: "Permissions-Policy",
    value: [
      "geolocation=(self)",
      "camera=()",
      "microphone=()",
      "payment=()",
      "usb=()",
      "bluetooth=()",
      "serial=()",
      "hid=()",
      "accelerometer=()",
      "gyroscope=()",
      "magnetometer=()",
      "display-capture=()",
      "screen-wake-lock=()",
      "interest-cohort=()",
    ].join(", "),
  },
];

const supabaseHostname = (() => {
  try { return supabaseOrigin ? new URL(supabaseOrigin).hostname : ""; }
  catch { return ""; }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHostname
      ? [{ protocol: "https", hostname: supabaseHostname, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
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
