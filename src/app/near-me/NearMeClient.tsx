"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { Trail } from "@/lib/types";
import NearbyTrails from "@/components/NearbyTrails";
import ElevationProfile from "@/components/ElevationProfile";
import { useT } from "@/lib/i18n/context";
import { parseGpx } from "@/lib/gpx-parse";

// ---------------------------------------------------------------------------
// Haversine distance helper (returns total km for an array of [lng, lat] coords)
// ---------------------------------------------------------------------------
function haversineDistanceKm(coords: [number, number][]): number {
  const R = 6371; // Earth radius in km
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lng1, lat1] = coords[i - 1];
    const [lng2, lat2] = coords[i];
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return total;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function NearMeClient({ trails }: { trails: Trail[] }) {
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importedName, setImportedName] = useState<string | null>(null);
  const [importedCoords, setImportedCoords] = useState<[number, number][] | null>(null);
  const [importedDistanceKm, setImportedDistanceKm] = useState<number | null>(null);
  const [importError, setImportError] = useState(false);

  function handleButtonClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset state before parsing
    setImportedName(null);
    setImportedCoords(null);
    setImportedDistanceKm(null);
    setImportError(false);

    try {
      // Hard size cap — a real GPX recording is well under 5 MB.
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("file too large");
      }
      const text = await file.text();
      const data = parseGpx(text);
      if (!data) {
        setImportError(true);
        return;
      }
      setImportedName(data.name);
      setImportedCoords(data.coords);
      setImportedDistanceKm(haversineDistanceKm(data.coords));
    } catch {
      setImportError(true);
    }

    // Reset file input so the same file can be re-imported if cleared
    e.target.value = "";
  }

  function handleClear() {
    setImportedName(null);
    setImportedCoords(null);
    setImportedDistanceKm(null);
    setImportError(false);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10">
      <Link href="/" className="text-sm hover:underline" style={{ color: "var(--text-muted)" }}>
        ← {t.allTrails}
      </Link>
      <header className="mt-3 mb-8">
        <h1
          className="font-display text-3xl font-bold tracking-[-0.02em]"
          style={{ color: "var(--text-primary)" }}
        >
          {t.nearMeHeading}
        </h1>
        <p className="mt-2 text-[15px]" style={{ color: "var(--text-muted)" }}>
          {t.nearMeSubheading}
        </p>
      </header>

      {/* ── GPX Import section ── */}
      <section className="mb-8">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".gpx"
          className="hidden"
          onChange={handleFileChange}
          aria-hidden="true"
        />

        {/* Import button — only shown when nothing is imported yet */}
        {!importedCoords && (
          <button
            type="button"
            onClick={handleButtonClick}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              background: "var(--btn-primary)",
              color: "var(--btn-primary-text)",
            }}
          >
            Import GPX
          </button>
        )}

        {/* Error state */}
        {importError && (
          <p className="mt-3 text-sm font-medium" style={{ color: "var(--ember)" }}>
            Couldn&apos;t read GPX file
          </p>
        )}

        {/* Result card */}
        {importedCoords && importedName !== null && importedDistanceKm !== null && (
          <div
            className="mt-4 rounded-xl border p-4"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--card-border)",
            }}
          >
            {/* Card header */}
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--summit-green)" }}>
                  Imported route
                </p>
                <h2 className="mt-0.5 text-lg font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
                  {importedName}
                </h2>
                <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                  Distance&nbsp;·&nbsp;
                  <span style={{ color: "var(--text-primary)" }}>
                    {importedDistanceKm.toFixed(1)} km
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={handleClear}
                className="shrink-0 rounded-md border px-3 py-1.5 text-sm transition-colors"
                style={{
                  background: "var(--surface-inset)",
                  borderColor: "var(--card-border)",
                  color: "var(--text-muted)",
                }}
              >
                Clear
              </button>
            </div>

            {/* Elevation profile */}
            <ElevationProfile geometry={importedCoords} />
          </div>
        )}
      </section>

      <NearbyTrails trails={trails} />
    </main>
  );
}
