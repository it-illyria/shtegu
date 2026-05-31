"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import type { Trail } from "@/lib/types";
import {
  resolveBasemap,
  OPENTOPO_STYLE,
  OSM_STYLE,
  thunderforestOutdoorsStyle,
  type BasemapChoice,
  type BaseId,
  type OverlayId,
} from "@/lib/basemap";
import { downloadTrailOffline, type OfflineStatus } from "@/lib/offline-maps";
import { fetchTrailPois, type PoiCollection, type PoiKind } from "@/lib/pois";
import { useI18n, interp } from "@/lib/i18n/context";

// ── Constants ─────────────────────────────────────────────────────────────────

const POI_SOURCE_ID    = "pois";
const POI_CIRCLE_LAYER = "poi-circles";
const POI_LABEL_LAYER  = "poi-labels";

const WAYMARKED_SOURCE = "waymarked";
const WAYMARKED_LAYER  = "waymarked-layer";

const MAPILLARY_SOURCE = "mapillary";
const MAPILLARY_LAYER  = "mapillary-layer";

const POI_STYLES: Record<PoiKind, { color: string; emoji: string }> = {
  water:     { color: "#0ea5e9", emoji: "🚰" },
  spring:    { color: "#06b6d4", emoji: "💧" },
  viewpoint: { color: "#9333ea", emoji: "🔭" },
  hut:       { color: "#d97706", emoji: "🏠" },
  pass:      { color: "#dc2626", emoji: "⛰️" },
};
const POI_KINDS = Object.keys(POI_STYLES) as PoiKind[];
const EMPTY_POIS: PoiCollection = { type: "FeatureCollection", features: [] };

// ── PMTiles protocol — register once ─────────────────────────────────────────

let pmtilesRegistered = false;
function ensurePmtilesProtocol() {
  if (pmtilesRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  pmtilesRegistered = true;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const TF_KEY = process.env.NEXT_PUBLIC_THUNDERFOREST_API_KEY?.trim() || "";
const ML_TOKEN = process.env.NEXT_PUBLIC_MAPILLARY_ACCESS_TOKEN?.trim() || "";

interface BasemapOption { id: BaseId; label: string }
const BASE_OPTIONS: BasemapOption[] = [
  { id: "default",  label: "Standard" },
  { id: "topo",     label: "Topo" },
  ...(TF_KEY ? [{ id: "outdoors" as BaseId, label: "Outdoors" }] : []),
];

interface OverlayOption { id: OverlayId; label: string; emoji: string }
const OVERLAY_OPTIONS: OverlayOption[] = [
  { id: "waymarked", label: "Hiking Routes", emoji: "🏔️" },
  ...(ML_TOKEN ? [{ id: "mapillary" as OverlayId, label: "Street Photos", emoji: "📷" }] : []),
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  trail: Trail;
  userPosition?: [number, number] | null;
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TrailMap({ trail, userPosition, className }: Props) {
  const { lang, t } = useI18n();
  const trailName = (lang === "sq" && trail.sq?.name) ? trail.sq.name : trail.name;

  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<maplibregl.Map | null>(null);
  const userMarker    = useRef<maplibregl.Marker | null>(null);
  const poisRef       = useRef<PoiCollection>(EMPTY_POIS);
  const overlaysRef   = useRef<Set<OverlayId>>(new Set());

  const [defaultBasemap, setDefaultBasemap] = useState<BasemapChoice | null>(null);
  const [activeBase,     setActiveBase]     = useState<BaseId>("default");
  const [activeOverlays, setActiveOverlays] = useState<Set<OverlayId>>(new Set());
  const [offline,        setOffline]        = useState<OfflineStatus>({ state: "idle" });
  const [poiCount,       setPoiCount]       = useState(0);
  const [poisVisible,    setPoisVisible]    = useState(true);
  const [showMapOptions, setShowMapOptions] = useState(false);

  const poiLabel: Record<PoiKind, string> = {
    water: t.poiWater, spring: t.poiSpring, viewpoint: t.poiViewpoint,
    hut: t.poiHut, pass: t.poiPass,
  };

  // ── Style helpers ───────────────────────────────────────────────────────────

  function styleForBase(id: BaseId, fallback: BasemapChoice): string | import("maplibre-gl").StyleSpecification {
    if (id === "topo") return OPENTOPO_STYLE;
    if (id === "outdoors" && TF_KEY) return thunderforestOutdoorsStyle(TF_KEY);
    return fallback.kind === "styleUrl" ? fallback.style : fallback.style;
  }

  // ── Map overlay helpers ─────────────────────────────────────────────────────

  function poiMatch(prop: "color" | "emoji"): unknown[] {
    const cases = POI_KINDS.flatMap((k) => [k, POI_STYLES[k][prop]]);
    return ["match", ["get", "kind"], ...cases, prop === "color" ? "#64748b" : "📍"];
  }

  function addTrailOverlay(map: maplibregl.Map) {
    if (!map.getSource("route")) {
      map.addSource("route", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: trail.geometry } },
      });
    }
    if (!map.getLayer("route-line")) {
      map.addLayer({
        id: "route-line", type: "line", source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#C0392B", "line-width": 4 },
      });
    }
    function makeEndpointMarker(label: string, bg: string, glyph: string): HTMLDivElement {
      const el = document.createElement("div");
      el.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:2px;pointer-events:auto;transform:translateY(-6px);";
      el.innerHTML =
        `<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:${bg};color:#fff;font-size:14px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35);">${glyph}</div>` +
        `<div style="background:${bg};color:#fff;font-size:10px;font-weight:700;letter-spacing:0.05em;padding:1px 6px;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,0.25);white-space:nowrap;">${label}</div>`;
      return el;
    }

    new maplibregl.Marker({ element: makeEndpointMarker(t.trailStartLabel, "#2D6A4F", "▶"), anchor: "bottom" })
      .setLngLat(trail.trailhead)
      .setPopup(new maplibregl.Popup({ offset: 8 }).setText(t.trailhead))
      .addTo(map);
    const endCoord = trail.geometry[trail.geometry.length - 1] as [number, number];
    new maplibregl.Marker({ element: makeEndpointMarker(t.trailEndLabel, "#C0392B", "■"), anchor: "bottom" })
      .setLngLat(endCoord)
      .setPopup(new maplibregl.Popup({ offset: 8 }).setText(t.destination))
      .addTo(map);
    const bounds = trail.geometry.reduce(
      (b, c) => b.extend(c as [number, number]),
      new maplibregl.LngLatBounds(trail.geometry[0] as [number, number], trail.geometry[0] as [number, number]),
    );
    map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
  }

  function addPoiLayer(map: maplibregl.Map, data: PoiCollection) {
    const existing = map.getSource(POI_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (existing) { existing.setData(data); }
    else { map.addSource(POI_SOURCE_ID, { type: "geojson", data }); }

    if (!map.getLayer(POI_CIRCLE_LAYER)) {
      map.addLayer({
        id: POI_CIRCLE_LAYER, type: "circle", source: POI_SOURCE_ID,
        paint: { "circle-radius": 7, "circle-color": poiMatch("color") as never,
                 "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" },
      } as maplibregl.LayerSpecification);
    }
    if (!map.getLayer(POI_LABEL_LAYER)) {
      map.addLayer({
        id: POI_LABEL_LAYER, type: "symbol", source: POI_SOURCE_ID,
        layout: { "text-field": poiMatch("emoji") as never, "text-size": 11, "text-allow-overlap": true },
      } as maplibregl.LayerSpecification);

      map.on("click", POI_CIRCLE_LAYER, (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const props = feature.properties as { kind?: string; name?: string };
        const kind  = (props.kind ?? "") as PoiKind;
        const label = poiLabel[kind] ?? POI_STYLES[kind]?.emoji ?? props.kind ?? "POI";
        const emoji = POI_STYLES[kind]?.emoji ?? "📍";
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`<strong>${escapeHtml(props.name ?? label)}</strong><br/><span>${emoji} ${escapeHtml(label)}</span>`)
          .addTo(map);
      });
      map.on("mouseenter", POI_CIRCLE_LAYER, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", POI_CIRCLE_LAYER, () => { map.getCanvas().style.cursor = ""; });
    }
    setPoiVisibility(map, poisVisible);
  }

  function setPoiVisibility(map: maplibregl.Map, visible: boolean) {
    const v = visible ? "visible" : "none";
    for (const id of [POI_CIRCLE_LAYER, POI_LABEL_LAYER]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", v);
    }
  }

  function addOverlayLayer(map: maplibregl.Map, id: OverlayId) {
    if (id === "waymarked") {
      if (!map.getSource(WAYMARKED_SOURCE)) {
        map.addSource(WAYMARKED_SOURCE, {
          type: "raster",
          tiles: ["https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png"],
          tileSize: 256, maxzoom: 19,
          attribution: "© Waymarked Trails",
        });
      }
      if (!map.getLayer(WAYMARKED_LAYER)) {
        map.addLayer({ id: WAYMARKED_LAYER, type: "raster", source: WAYMARKED_SOURCE,
          paint: { "raster-opacity": 0.85 } });
      }
    } else if (id === "mapillary" && ML_TOKEN) {
      if (!map.getSource(MAPILLARY_SOURCE)) {
        map.addSource(MAPILLARY_SOURCE, {
          type: "vector",
          tiles: [`https://tiles.mapillary.com/maps/vtp/mly1_computed_public/2/{z}/{x}/{y}?access_token=${ML_TOKEN}`],
          minzoom: 6, maxzoom: 14,
        });
      }
      if (!map.getLayer(MAPILLARY_LAYER)) {
        map.addLayer({
          id: MAPILLARY_LAYER, type: "circle", source: MAPILLARY_SOURCE,
          "source-layer": "image",
          paint: { "circle-radius": 2, "circle-color": "#05CB63", "circle-opacity": 0.7 },
        } as maplibregl.LayerSpecification);
      }
    }
  }

  function removeOverlayLayer(map: maplibregl.Map, id: OverlayId) {
    const layer  = id === "waymarked" ? WAYMARKED_LAYER  : MAPILLARY_LAYER;
    const source = id === "waymarked" ? WAYMARKED_SOURCE : MAPILLARY_SOURCE;
    if (map.getLayer(layer))  map.removeLayer(layer);
    if (map.getSource(source)) map.removeSource(source);
  }

  // Re-add all custom layers on top of a freshly-loaded style.
  function restoreCustomLayers(map: maplibregl.Map) {
    if (!map.isStyleLoaded()) return;
    if (!map.getSource("route")) addTrailOverlay(map);
    if (poisRef.current.features.length && !map.getSource(POI_SOURCE_ID)) {
      addPoiLayer(map, poisRef.current);
    }
    for (const id of overlaysRef.current) {
      if (!map.getSource(id === "waymarked" ? WAYMARKED_SOURCE : MAPILLARY_SOURCE)) {
        addOverlayLayer(map, id);
      }
    }
  }

  // ── Resolve default basemap once ────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    resolveBasemap().then((c) => { if (!cancelled) setDefaultBasemap(c); });
    return () => { cancelled = true; };
  }, []);

  // ── Init map ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !defaultBasemap) return;
    ensurePmtilesProtocol();

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleForBase(activeBase, defaultBasemap),
      center: trail.trailhead,
      zoom: 12,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    // Auto-fallback to plain OSM raster if the configured basemap fails on
    // this device. Vector PMTiles can silently fail on some mobile WebGL
    // implementations, leaving the canvas blank while overlays still render.
    let fellBackToOsm = false;
    map.on("error", (e) => {
      console.warn("[TrailMap] map error", e?.error?.message ?? e);
      const msg = (e?.error?.message ?? "").toLowerCase();
      const tileOrStyleError =
        msg.includes("tile") || msg.includes("style") ||
        msg.includes("glyph") || msg.includes("sprite") ||
        msg.includes("source") || msg.includes("pmtiles");
      if (!fellBackToOsm && tileOrStyleError && activeBase === "default") {
        fellBackToOsm = true;
        console.warn("[TrailMap] falling back to OSM raster basemap");
        try { map.setStyle(OSM_STYLE); } catch {}
      }
    });

    map.on("load", () => {
      addTrailOverlay(map);
      if (poisRef.current.features.length) addPoiLayer(map, poisRef.current);
      for (const id of overlaysRef.current) addOverlayLayer(map, id);
      // Mobile Safari/Chrome sometimes init the canvas at 0×0 because the
      // container's final size isn't laid out yet. Force a resize once the
      // basemap is ready so the canvas matches the visible box.
      map.resize();

      // Silent-failure guard: some mobile WebGL implementations leave the
      // basemap blank without firing an error event. After a short grace
      // period, if no basemap tiles have actually painted, swap to OSM
      // raster — it's a guaranteed-working fallback.
      setTimeout(() => {
        if (fellBackToOsm || activeBase !== "default") return;
        try {
          if (!map.areTilesLoaded()) {
            console.warn("[TrailMap] tiles never loaded — falling back to OSM raster");
            fellBackToOsm = true;
            map.setStyle(OSM_STYLE);
          }
        } catch {}
      }, 3500);
    });

    map.on("styledata", () => { restoreCustomLayers(map); });

    // ResizeObserver covers later layout shifts (orientation change,
    // address-bar collapse, parent flex changes) so the basemap repaints.
    const ro = new ResizeObserver(() => { map.resize(); });
    ro.observe(containerRef.current);

    return () => { ro.disconnect(); map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultBasemap]);

  // ── Switch basemap ───────────────────────────────────────────────────────────

  function handleBaseSwitch(id: BaseId) {
    if (id === activeBase) return;
    setActiveBase(id);
    const map = mapRef.current;
    if (!map || !defaultBasemap) return;
    map.setStyle(styleForBase(id, defaultBasemap));
  }

  // ── Toggle overlay ───────────────────────────────────────────────────────────

  function handleOverlayToggle(id: OverlayId) {
    const map = mapRef.current;
    setActiveOverlays((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (map) removeOverlayLayer(map, id);
      } else {
        next.add(id);
        if (map && map.isStyleLoaded()) addOverlayLayer(map, id);
      }
      overlaysRef.current = next;
      return next;
    });
  }

  // ── User position marker ─────────────────────────────────────────────────────

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userPosition) return;
    if (!userMarker.current) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:16px;height:16px;border-radius:9999px;background:var(--summit-green);box-shadow:0 0 0 4px color-mix(in srgb,var(--summit-green) 30%,transparent);box-shadow:0 1px 3px rgba(0,0,0,.3)";
      userMarker.current = new maplibregl.Marker({ element: el });
    }
    userMarker.current.setLngLat(userPosition).addTo(map);
  }, [userPosition]);

  // ── POIs ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const controller = new AbortController();
    fetchTrailPois(trail.geometry, controller.signal).then((data) => {
      if (controller.signal.aborted) return;
      poisRef.current = data;
      setPoiCount(data.features.length);
      const map = mapRef.current;
      if (map && data.features.length && map.isStyleLoaded()) addPoiLayer(map, data);
    });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trail]);

  // ── POI visibility ───────────────────────────────────────────────────────────

  useEffect(() => {
    const map = mapRef.current;
    if (map) setPoiVisibility(map, poisVisible);
  }, [poisVisible]);

  // ── Offline download ─────────────────────────────────────────────────────────

  const canDownload = defaultBasemap?.kind === "pmtiles";

  async function handleDownload() {
    if (defaultBasemap?.kind !== "pmtiles") return;
    await downloadTrailOffline(
      { pmtilesUrl: defaultBasemap.pmtilesUrl, trailSlug: trail.slug, geometry: trail.geometry },
      setOffline,
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className={className ?? "h-full w-full"}
        aria-label={interp(t.mapAria, { name: trailName })}
      />

      {/* Offline download — top-left */}
      {canDownload && (
        <button
          type="button"
          onClick={handleDownload}
          disabled={offline.state === "downloading"}
          className="absolute left-2 top-2 z-10 rounded-lg px-3 py-1.5 text-xs font-medium shadow backdrop-blur disabled:opacity-60 transition-colors"
          style={{ background: "var(--overlay-bg)", color: "var(--overlay-text)", outline: "1px solid var(--overlay-border)" }}
        >
          {offline.state === "downloading" ? t.downloading
            : offline.state === "done"     ? t.offlineMapReady
            : offline.state === "error"    ? t.downloadFailed
            : t.downloadOfflineMap}
        </button>
      )}

      {/* Map style picker — bottom-left */}
      <div className="absolute bottom-2 left-2 z-10">
        <button
          type="button"
          onClick={() => setShowMapOptions((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium shadow backdrop-blur transition-colors"
          style={{ background: "var(--overlay-bg)", color: "var(--overlay-text)", outline: "1px solid var(--overlay-border)" }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M1 3l5-1 4 1 5-2v11l-5 2-4-1-5 1V3Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M6 2v11M10 3v11" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
          Layers
        </button>

        {showMapOptions && (
          <div
            className="absolute bottom-9 left-0 min-w-40 rounded-xl p-3 shadow-lg"
            style={{ background: "var(--card-bg)", outline: "1px solid var(--card-border)" }}
          >
            {/* Basemap options */}
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Basemap
            </p>
            <div className="flex flex-col gap-1 mb-3">
              {BASE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleBaseSwitch(opt.id)}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-left transition-colors"
                  style={
                    activeBase === opt.id
                      ? { background: "var(--summit-green)", color: "#fff" }
                      : { background: "var(--surface-inset)", color: "var(--text-primary)" }
                  }
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full border-2"
                    style={{ borderColor: activeBase === opt.id ? "#fff" : "var(--text-muted)",
                             background: activeBase === opt.id ? "#fff" : "transparent" }}
                  />
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Overlays */}
            {OVERLAY_OPTIONS.length > 0 && (
              <>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  Overlays
                </p>
                <div className="flex flex-col gap-1">
                  {OVERLAY_OPTIONS.map((opt) => {
                    const on = activeOverlays.has(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleOverlayToggle(opt.id)}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-left transition-colors"
                        style={
                          on
                            ? { background: "rgba(107,163,104,0.15)", color: "#3F6B46" }
                            : { background: "var(--surface-inset)", color: "var(--text-primary)" }
                        }
                      >
                        <span aria-hidden>{opt.emoji}</span>
                        {opt.label}
                        <span className="ml-auto" style={{ color: on ? "#6BA368" : "var(--text-muted)" }}>
                          {on ? "✓" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* POI legend — bottom-right */}
      {poiCount > 0 && (
        <div
          className="absolute bottom-2 right-2 z-10 rounded-lg p-2 text-xs shadow backdrop-blur"
          style={{ background: "var(--overlay-bg)", color: "var(--overlay-text)", outline: "1px solid var(--overlay-border)" }}
        >
          <button
            type="button"
            onClick={() => setPoisVisible((v) => !v)}
            className="mb-1 flex w-full items-center justify-between gap-2 rounded px-1 py-0.5 font-medium transition-colors"
            style={{ color: "var(--overlay-text)" }}
            aria-pressed={poisVisible}
          >
            <span>{t.pointsOfInterest}</span>
            <span aria-hidden>{poisVisible ? "👁️" : "🚫"}</span>
          </button>
          {poisVisible && (
            <ul className="space-y-0.5">
              {POI_KINDS.map((kind) => (
                <li key={kind} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-white"
                    style={{ backgroundColor: POI_STYLES[kind].color }}
                    aria-hidden
                  />
                  <span>{POI_STYLES[kind].emoji} {poiLabel[kind]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
