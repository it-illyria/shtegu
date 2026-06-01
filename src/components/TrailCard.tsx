"use client";

import Link from "next/link";
import Image from "next/image";
import type { Difficulty, Trail } from "@/lib/types";
import { useI18n, interp } from "@/lib/i18n/context";
import { useBookmarks } from "@/hooks/useBookmarks";

const HEADER_GRAD: Record<Difficulty, string> = {
  easy:     "linear-gradient(175deg, #1A3D2B 0%, #2F5E42 35%, #3D7854 65%, #4A8F65 100%)",
  moderate: "linear-gradient(175deg, #3C1800 0%, #6B3008 35%, #9A5012 65%, #C0700E 100%)",
  hard:     "linear-gradient(175deg, #2A0606 0%, #5C0E0E 35%, #8C1C1C 65%, #B03030 100%)",
  expert:   "linear-gradient(175deg, #06080F 0%, #0F1428 35%, #1A2040 65%, #2C3560 100%)",
};

const BADGE_COLOR: Record<Difficulty, string> = {
  easy:     "#6BA368",
  moderate: "#D9A441",
  hard:     "#C96B4B",
  expert:   "#8A3E3E",
};

const RIDGES = [
  "M0,100 L0,62 L35,40 L62,58 L92,26 L122,48 L155,10 L182,34 L215,18 L248,40 L270,28 L280,100 Z",
  "M0,100 L0,70 L40,44 L72,64 L108,28 L138,52 L168,14 L198,38 L232,20 L260,44 L280,100 Z",
  "M0,100 L0,58 L28,34 L56,52 L84,18 L116,44 L148,8 L180,30 L214,12 L244,36 L268,22 L280,100 Z",
  "M0,100 L0,66 L50,40 L80,62 L114,28 L144,52 L176,16 L210,42 L242,24 L266,48 L280,100 Z",
  "M0,100 L0,74 L44,48 L76,68 L110,34 L140,58 L172,22 L206,46 L238,28 L264,52 L280,100 Z",
  "M0,100 L0,54 L24,28 L50,48 L78,14 L110,38 L144,4 L176,26 L210,8 L242,32 L270,16 L280,100 Z",
];

function slugHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return h;
}

function fakeRating(slug: string): { score: string; count: string } {
  const h = slugHash(slug);
  const score = (4.0 + (h % 10) * 0.1).toFixed(1);
  const count = String(50 + (h % 2200));
  return { score, count };
}

const BADGE_LABEL: Record<Difficulty, string> = {
  easy: "Easy", moderate: "Moderate", hard: "Hard", expert: "Expert",
};

export default function TrailCard({ trail, distanceKm }: { trail: Trail; distanceKm?: number }) {
  const { lang, t } = useI18n();
  const { bookmarks, toggle } = useBookmarks();
  const saved = bookmarks.has(trail.slug);

  const regionLabels: Record<string, string> = {
    "Rajoni Verior & Verilindor": t.regionNorth,
    "Rajoni Perëndimor":          t.regionWest,
    "Rajoni Juglindor":           t.regionSouthEast,
    "Rajoni Jugor":               t.regionSouth,
  };

  const name   = lang === "sq" && trail.sq?.name   ? trail.sq.name   : trail.name;
  const region = regionLabels[trail.region] ?? trail.region;

  const h = slugHash(trail.slug);
  const frontIdx = h % RIDGES.length;
  const backIdx  = (h + 2) % RIDGES.length;
  const { score, count } = fakeRating(trail.slug);

  const hasCover = Boolean(trail.coverImageUrl);

  return (
    <Link
      href={`/trails/${trail.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
      style={{ minHeight: "260px", background: hasCover ? "#1B2620" : HEADER_GRAD[trail.difficulty] }}
    >
      {/* Cover image — shown when present, otherwise the gradient + mountain silhouettes */}
      {hasCover && (
        <Image
          src={trail.coverImageUrl as string}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="absolute inset-0 object-cover transition-transform duration-300 group-hover:scale-105"
          priority={false}
        />
      )}

      {/* Mountain silhouettes — only when no cover image */}
      {!hasCover && (
        <svg
          viewBox="0 0 280 100"
          className="absolute bottom-0 left-0 w-full"
          style={{ height: 100 }}
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d={RIDGES[backIdx]}  fill="rgba(255,255,255,0.04)" />
          <path d={RIDGES[frontIdx]} fill="rgba(0,0,0,0.22)" />
        </svg>
      )}

      {/* Bottom dark overlay — heavier when there's a photo so text stays legible */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: hasCover ? "85%" : "75%",
          background: hasCover
            ? "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.65) 45%, rgba(0,0,0,0.15) 85%, transparent 100%)"
            : "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 50%, transparent 100%)",
        }}
      />

      {/* Bookmark button — top right */}
      <button
        aria-label={saved ? t.savedUnsave : t.savedBookmark}
        onClick={(e) => { e.preventDefault(); toggle(trail.slug); }}
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
        style={{
          background: saved ? "var(--summit-green)" : "rgba(255,255,255,0.12)",
          border: saved ? "1px solid var(--summit-green)" : "1px solid rgba(255,255,255,0.18)",
          color: saved ? "#ffffff" : "rgba(255,255,255,0.85)",
        }}
      >
        <svg width="12" height="14" viewBox="0 0 14 16" aria-hidden fill={saved ? "currentColor" : "none"}>
          <path d="M2 1h10a1 1 0 0 1 1 1v12l-6-3.5L1 14V2a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Card body — sits over the dark overlay */}
      <div className="relative mt-auto px-4 pb-4 pt-3">
        {/* Difficulty badge */}
        <span
          className="mb-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
          style={{ background: BADGE_COLOR[trail.difficulty] }}
        >
          {BADGE_LABEL[trail.difficulty]}
        </span>

        {/* Name */}
        <h2 className="font-display text-[18px] font-bold leading-snug text-white">
          {name}
        </h2>

        {/* Location */}
        <div className="mt-1 flex items-center gap-1">
          <svg width="10" height="10" viewBox="0 0 12 14" fill="none" aria-hidden>
            <path d="M6 13C4 10.5 1.5 8.8 1.5 5.5a4.5 4.5 0 0 1 9 0C10.5 8.8 8 10.5 6 13Z" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="6" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.60)" }}>{region}</span>
        </div>

        {/* Stats */}
        <div className="mt-2.5 flex items-center gap-4 text-[12px] tabular-nums" style={{ color: "rgba(255,255,255,0.70)" }}>
          <span className="flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M2 12 L7 2 L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 8.5h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            {trail.distanceKm} km
          </span>
          <span className="flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M7 12V2M3.5 5.5l3.5-3.5 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {trail.ascentM} m
          </span>
          <span className="flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden>
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M7 4.5v3l1.8 1.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {trail.durationHours}h
          </span>
          {distanceKm !== undefined && (
            <span style={{ color: "#4AAF80" }}>
              {distanceKm < 1
                ? interp(t.distanceMeters, { m: Math.round(distanceKm * 1000) })
                : interp(t.distanceKm, { km: distanceKm.toFixed(1) })}
            </span>
          )}
        </div>

        {/* Rating */}
        <div className="mt-2 flex items-center gap-1.5 text-[12px]">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="#E68A2E" aria-hidden>
            <path d="M7 1l1.5 3.5L12 5l-2.5 2.5.6 3.5L7 9.5l-3.1 1.5.6-3.5L2 5l3.5-.5L7 1Z" />
          </svg>
          <span className="font-semibold text-white">{score}</span>
          <span style={{ color: "rgba(255,255,255,0.45)" }}>({count})</span>
        </div>
      </div>
    </Link>
  );
}
