"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Link from "next/link";
import type { Trail } from "@/lib/types";
import DifficultyBadge from "@/components/DifficultyBadge";
import ElevationProfile from "@/components/ElevationProfile";
import SeasonCalendar from "@/components/SeasonCalendar";
import ConditionReport from "@/components/ConditionReport";
import Reviews from "@/components/Reviews";
import TrailPhotos from "@/components/TrailPhotos";
import WeatherWidget from "@/components/WeatherWidget";
import SafetyNotice from "@/components/SafetyNotice";
import TrailEditModal from "@/components/TrailEditModal";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useI18n, interp } from "@/lib/i18n/context";

function downloadGpx(trail: Trail): void {
  const trkpts = trail.geometry
    .map(([lng, lat]) => `    <trkpt lat="${lat}" lon="${lng}"></trkpt>`)
    .join("\n");

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Shtegu" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${trail.name}</name>
  </metadata>
  <trk>
    <name>${trail.name}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;

  const blob = new Blob([gpx], { type: "application/gpx+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${trail.slug}.gpx`;
  a.click();
  URL.revokeObjectURL(url);
}

const TrailMap = dynamic(() => import("@/components/TrailMap"), {
  ssr: false,
  loading: () => <TrailMapLoading />,
});

function TrailMapLoading() {
  const { t } = useI18n();
  return (
    <div className="grid h-full w-full place-items-center text-sm"
      style={{ background: "var(--surface-inset)", color: "var(--text-muted)" }}>
      {t.loadingMap}
    </div>
  );
}

export default function TrailView({ trail }: { trail: Trail }) {
  const geo = useGeolocation();
  const { lang, t } = useI18n();
  const [editOpen, setEditOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      void navigator.share({ title: trail.name, url });
    } else {
      void navigator.clipboard.writeText(url).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      });
    }
  }

  const name       = (lang === "sq" && trail.sq?.name)       ? trail.sq.name       : trail.name;
  const region     = (lang === "sq" && trail.sq?.region)     ? trail.sq.region     : trail.region;
  const summary    = (lang === "sq" && trail.sq?.summary)    ? trail.sq.summary    : trail.summary;
  const bestMonths = (lang === "sq" && trail.sq?.bestMonths) ? trail.sq.bestMonths : trail.bestMonths;
  const logistics  = (lang === "sq" && trail.sq?.logistics)  ? trail.sq.logistics  : trail.logistics;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8">
      <Link href="/" className="text-sm hover:underline" style={{ color: "var(--text-muted)" }}>
        ← {t.allTrails}
      </Link>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-[-0.02em]" style={{ color: "var(--text-primary)" }}>
            {name}
          </h1>
          <p className="mt-1 text-[13px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--text-muted)" }}>
            {region}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <DifficultyBadge level={trail.difficulty} />
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
              style={{ background: "var(--surface-inset)", color: shareCopied ? "var(--summit-green)" : "var(--text-muted)", border: "1px solid var(--card-border)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = shareCopied ? "var(--summit-green)" : "var(--text-muted)"; }}
            >
              {shareCopied ? `✓ ${t.shareCopied}` : `↗ ${t.shareButton}`}
            </button>
            <button
              onClick={() => setEditOpen(true)}
              className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
              style={{ background: "var(--surface-inset)", color: "var(--text-muted)", border: "1px solid var(--card-border)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
            >
              ✏ {t.editSuggestButton}
            </button>
          </div>
        </div>
      </div>

      {editOpen && <TrailEditModal trail={trail} onClose={() => setEditOpen(false)} />}

      <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "var(--text-primary)" }}>{summary}</p>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          [t.distance, `${trail.distanceKm} km`],
          [t.ascent,   `${trail.ascentM} m`],
          [t.duration, `~${trail.durationHours} h`],
        ] as [string, string][]).map(([k, v]) => (
          <div key={k} className="rounded-xl p-3" style={{ background: "var(--surface-inset)" }}>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--text-muted)" }}>{k}</dt>
            <dd className="mt-1 text-base font-bold" style={{ color: "var(--text-primary)" }}>{v}</dd>
          </div>
        ))}
        <div className="rounded-xl p-3" style={{ background: "var(--surface-inset)" }}>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--text-muted)" }}>{t.season}</dt>
          <dd className="mt-2"><SeasonCalendar bestMonths={trail.bestMonths} /></dd>
        </div>
      </dl>

      <SafetyNotice />

      <div className="mt-6 overflow-hidden rounded-xl border" style={{ borderColor: "var(--card-border)" }}>
        <div className="h-80"><TrailMap trail={trail} userPosition={geo.position} /></div>
        <div className="flex flex-col gap-3 border-t p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4" style={{ borderColor: "var(--card-border)" }}>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              onClick={geo.watching ? geo.stop : geo.start}
              className="inline-flex h-11 w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors sm:h-9 sm:w-auto"
              style={{ background: "var(--btn-primary)", color: "var(--btn-primary-text)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--btn-primary-hover)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--btn-primary)"; }}
            >
              {geo.watching ? t.stopNavigation : t.navigate}
            </button>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <button
                onClick={() => downloadGpx(trail)}
                className="inline-flex h-10 items-center justify-center rounded-full px-3 text-[13px] font-medium transition-colors sm:h-9"
                style={{ background: "var(--surface-inset)", color: "var(--text-muted)", border: "1px solid var(--card-border)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
              >
                ↓ {t.downloadGpx}
              </button>
              <Link
                href={`/activity?trail=${trail.slug}`}
                className="inline-flex h-10 items-center justify-center rounded-full px-3 text-[13px] font-medium transition-colors sm:h-9"
                style={{ background: "var(--surface-inset)", color: "var(--text-muted)", border: "1px solid var(--card-border)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--summit-green)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-muted)"; }}
              >
                ✓ {t.logHikeButton}
              </Link>
            </div>
          </div>
          <span className="text-center text-xs sm:text-right" style={{ color: "var(--text-muted)" }}>
            {geo.error
              ? (geo.error === "denied" ? t.locationDenied
                : geo.error === "timeout" ? t.locationTimeout
                : geo.error === "unsupported" ? t.locationUnsupported
                : t.locationUnavailable)
              : geo.position
                ? interp(t.accuracy, { m: Math.round(geo.accuracy ?? 0) })
                : t.locationOff}
          </span>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t.elevation}</h2>
        <div className="mt-3"><ElevationProfile geometry={trail.geometry} /></div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t.weather}</h2>
        <WeatherWidget trailhead={trail.trailhead} />
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t.logistics}</h2>
        <ul className="mt-3 space-y-2">
          {logistics.map((l) => (
            <li key={l} className="flex gap-3 text-sm" style={{ color: "var(--text-primary)" }}>
              <span style={{ color: "var(--summit-green)" }} aria-hidden>→</span>{l}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t.conditionHeading}</h2>
        <ConditionReport trailSlug={trail.slug} />
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t.photosHeading}</h2>
        <TrailPhotos trailSlug={trail.slug} />
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t.reviews}</h2>
        <Reviews trailSlug={trail.slug} />
      </section>

      {trail.source && (
        <p className="mt-10 text-xs" style={{ color: "var(--text-muted)" }}>
          {interp(t.routeSource, { source: trail.source })}
        </p>
      )}
    </main>
  );
}
