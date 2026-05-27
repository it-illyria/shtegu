"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Difficulty, Trail } from "@/lib/types";
import TrailCard from "@/components/TrailCard";
import TrailList from "@/components/TrailList";
import TrailProposalModal from "@/components/TrailProposalModal";
import { useI18n, useT } from "@/lib/i18n/context";
import { getTrailheadWeather, type WeatherCurrent, type WeatherDay } from "@/lib/weather";
import { buildElevationProfile } from "@/lib/elevation";

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return h;
}

function fakeRating(slug: string) {
  const h = slugHash(slug);
  return { score: (4.0 + (h % 10) * 0.1).toFixed(1), count: 50 + (h % 2200) };
}

const DIFF_LABEL: Record<Difficulty, string> = { easy: "Easy", moderate: "Moderate", hard: "Hard", expert: "Expert" };
const DIFF_BADGE: Record<Difficulty, string> = { easy: "#6BA368", moderate: "#D9A441", hard: "#C96B4B", expert: "#8A3E3E" };
const HERO_RIDGES = [
  "M0,420 L0,270 L80,220 L160,255 L270,175 L370,220 L470,140 L560,185 L670,110 L775,160 L875,90 L970,145 L1060,75 L1160,120 L1280,80 L1440,105 L1440,420 Z",
  "M0,420 L0,320 L110,280 L220,310 L350,255 L460,295 L580,228 L685,270 L800,205 L910,248 L1020,188 L1130,228 L1230,195 L1340,225 L1440,210 L1440,420 Z",
  "M0,420 L0,370 L160,335 L300,358 L440,308 L560,342 L700,290 L820,328 L950,278 L1070,314 L1190,272 L1310,305 L1440,285 L1440,420 Z",
];

// ── Featured Hero ─────────────────────────────────────────────────────────────

const GRAD: Record<string, string> = {
  easy:     "linear-gradient(175deg, #1A4A30 0%, #2D6B44 45%, #3D8055 80%, #4A9065 100%)",
  moderate: "linear-gradient(175deg, #2C1200 0%, #5E2E05 45%, #8C4A10 80%, #B06018 100%)",
  hard:     "linear-gradient(175deg, #200505 0%, #4A0C0C 45%, #7A1818 80%, #A02828 100%)",
  expert:   "linear-gradient(175deg, #050810 0%, #0E1428 45%, #1C2545 80%, #2C3860 100%)",
};

function FeaturedHero({ trails, onActiveChange }: { trails: Trail[]; onActiveChange?: (i: number) => void }) {
  const { lang } = useI18n();
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % trails.length), 5000);
    return () => clearInterval(id);
  }, [trails.length]);

  useEffect(() => { onActiveChange?.(active); }, [active, onActiveChange]);

  function goTo(i: number) { setActive(i); }

  return (
    <div className="relative overflow-hidden rounded-[24px]" style={{ height: "420px" }}>
      {trails.map((trail, idx) => {
        const isActive = idx === active;
        const name    = lang === "sq" && trail.sq?.name    ? trail.sq.name    : trail.name;
        const summary = lang === "sq" && trail.sq?.summary ? trail.sq.summary : trail.summary;

        return (
          <div
            key={trail.slug}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ background: GRAD[trail.difficulty], opacity: isActive ? 1 : 0, pointerEvents: isActive ? "auto" : "none" }}
            aria-hidden={!isActive}
          >
            {/* Atmospheric ridges */}
            <svg viewBox="0 0 1440 420" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMax slice" aria-hidden>
              <path d={HERO_RIDGES[0]} fill="rgba(255,255,255,0.04)" />
              <path d={HERO_RIDGES[1]} fill="rgba(0,0,0,0.15)" />
              <path d={HERO_RIDGES[2]} fill="rgba(0,0,0,0.22)" />
            </svg>

            {/* Dark overlay */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.25) 45%, transparent 100%)" }} />

            {/* Hero text content */}
            <div className="absolute bottom-0 left-0 right-0 z-10 px-8 pb-14">
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.55)" }}>
                Featured Trail
              </span>
              <h1 className="mt-1 font-display text-[42px] font-bold leading-tight tracking-[-0.025em] text-white sm:text-[52px]">
                {name}
              </h1>
              <p className="mt-2 max-w-md text-[14px] leading-relaxed" style={{ color: "rgba(255,255,255,0.68)" }}>
                {summary}
              </p>

              {/* Stats row */}
              <div className="mt-4 flex flex-wrap items-center gap-5 text-[13px]" style={{ color: "rgba(255,255,255,0.75)" }}>
                <span className="flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <circle cx="7" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M7 13C5 10.5 1.5 8.5 1.5 4.5a5.5 5.5 0 0 1 11 0C12.5 8.5 9 10.5 7 13Z" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                  <strong className="text-white">{trail.distanceKm} km</strong>
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>Distance</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <path d="M7 12V2M3.5 5.5l3.5-3.5 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <strong className="text-white">{trail.ascentM} m</strong>
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>Elevation Gain</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M7 4v3.5l2 1.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <strong className="text-white">{trail.durationHours}h</strong>
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>Est. Time</span>
                </span>
                <span
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold"
                  style={{ background: DIFF_BADGE[trail.difficulty], color: "#fff" }}
                >
                  {DIFF_LABEL[trail.difficulty]}
                </span>
              </div>

              {/* CTA buttons */}
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/trails/${trail.slug}`}
                  className="flex h-12 items-center gap-2 rounded-[16px] px-6 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: "#3F6B46" }}
                >
                  View Trail
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
                <button
                  className="flex h-12 items-center gap-2 rounded-[16px] px-6 text-[14px] font-semibold transition-opacity hover:opacity-80"
                  style={{ border: "1px solid rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.90)" }}
                >
                  Save Trail
                  <svg width="13" height="15" viewBox="0 0 14 16" fill="none" aria-hidden>
                    <path d="M2 1h10a1 1 0 0 1 1 1v12l-6-3.5L1 14V2a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Dots — sit above all slides */}
      <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
        {trails.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="rounded-full transition-all"
            style={{ width: i === active ? 20 : 6, height: 6, background: i === active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)" }}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Right Panel ───────────────────────────────────────────────────────────────

function RightPanel({ onPropose, trailhead, featuredSlug }: { onPropose: () => void; trailhead?: [number, number]; featuredSlug?: string }) {
  const [wx, setWx] = useState<WeatherCurrent | null>(null);
  const [daily, setDaily] = useState<WeatherDay[]>([]);
  const [wxStatus, setWxStatus] = useState<"loading" | "ready" | "error">("loading");
  const [retryKey, setRetryKey] = useState(0);
  const { lang } = useI18n();

  useEffect(() => {
    const coords = trailhead ?? [20.07, 41.33]; // Albania centre fallback
    const ctrl = new AbortController();
    setWxStatus("loading");
    void getTrailheadWeather(coords, ctrl.signal).then((res) => {
      if (ctrl.signal.aborted) return;
      if (res) { setWx(res.current); setDaily(res.daily); setWxStatus("ready"); }
      else setWxStatus("error");
    });
    return () => ctrl.abort();
  }, [trailhead, retryKey]);
  const planItems = [
    { label: "Find Trails",      desc: "Explore curated trails",      icon: <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden><path d="M2 16 L2 11 L7 5 L10 9 L13 3 L18 9 L18 16 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>, href: "/" },
    { label: "Route Planner",    desc: "Create your own route",        icon: <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden><path d="M3 17C5 10 10 6 17 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="3" cy="17" r="2.5" stroke="currentColor" strokeWidth="1.3" /><circle cx="17" cy="3" r="2.5" stroke="currentColor" strokeWidth="1.3" /></svg>, href: "/near-me" },
    { label: "Check Conditions", desc: "Weather, closures, alerts",   icon: <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden><path d="M5 14a4 4 0 0 1 0-8h.5A5 5 0 0 1 15 8.5a3.5 3.5 0 0 1 0 7H5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>, href: "/safety" },
    { label: "Gear Checklist",   desc: "Be prepared for anything",    icon: <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden><rect x="3" y="2" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.4" /><path d="M7 8h6M7 12h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>, href: "/gear" },
  ];

  return (
    <aside className="hidden xl:flex w-80 shrink-0 flex-col gap-4">
      {/* Plan Your Adventure */}
      <div
        className="rounded-2xl border p-5"
        style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
      >
        <h3 className="mb-3 text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>Plan Your Adventure</h3>
        <ul className="flex flex-col divide-y" style={{ borderColor: "var(--card-border)" }}>
          {planItems.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className="flex items-center gap-3 py-3 transition-opacity hover:opacity-70"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: "var(--surface-inset)", color: "var(--text-muted)" }}
                >
                  {item.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>{item.label}</p>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden style={{ color: "var(--text-muted)" }}>
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Current Conditions */}
      <div
        className="rounded-2xl border p-5"
        style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>Current Conditions</h3>
          {featuredSlug && (
            <Link
              href={`/trails/${featuredSlug}#weather`}
              className="text-[11px] font-medium transition-opacity hover:opacity-70"
              style={{ color: "var(--summit-green)" }}
            >
              View all
            </Link>
          )}
        </div>

        {wxStatus === "loading" && (
          <div className="flex flex-col gap-2">
            {[40, 60, 40].map((w, i) => (
              <div key={i} className="h-3 animate-pulse rounded" style={{ width: `${w}%`, background: "var(--surface-inset)" }} />
            ))}
          </div>
        )}
        {wxStatus === "error" && (
          <div className="flex items-center justify-between">
            <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>Weather unavailable.</p>
            <button
              onClick={() => setRetryKey((k) => k + 1)}
              className="text-[11px] font-medium transition-opacity hover:opacity-70"
              style={{ color: "var(--summit-green)" }}
            >
              Retry
            </button>
          </div>
        )}
        {wxStatus === "ready" && wx && (
          <>
            {/* Current */}
            <div className="flex items-center gap-3">
              <span className="text-3xl leading-none" aria-hidden>{wx.emoji}</span>
              <div>
                <span className="text-[22px] font-semibold leading-none" style={{ color: "var(--text-primary)" }}>
                  {Math.round(wx.temperatureC)}°C
                </span>
                <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                  {lang === "sq" ? wx.labelSq : wx.label}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-1 text-[12px]" style={{ color: "var(--text-muted)" }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M8 1C5.8 1 4 2.8 4 5c0 1 .4 2 1 2.7L8 15l3-7.3C11.6 7 12 6 12 5c0-2.2-1.8-4-4-4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                  <circle cx="8" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                {Math.round(wx.windKph)} km/h
              </div>
            </div>

            {/* 3-day forecast */}
            {daily.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-1.5 border-t pt-3" style={{ borderColor: "var(--card-border)" }}>
                {daily.slice(1, 4).map((day) => {
                  const d = new Date(day.date);
                  const name = d.toLocaleDateString(lang === "sq" ? "sq-AL" : "en-GB", { weekday: "short" });
                  return (
                    <div key={day.date} className="flex flex-col items-center gap-0.5 rounded-xl py-2" style={{ background: "var(--surface-inset)" }}>
                      <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{name}</span>
                      <span className="text-lg leading-none" aria-hidden>{day.emoji}</span>
                      <span className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>{Math.round(day.maxC)}°</span>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{Math.round(day.minC)}°</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Recent Activity */}
      <div
        className="rounded-2xl border p-5"
        style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>Recent Activity</h3>
          <button className="text-[11px] font-medium transition-opacity hover:opacity-70" style={{ color: "var(--summit-green)" }}>View all</button>
        </div>
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
            style={{ background: "rgba(107,163,104,0.15)" }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden style={{ color: "#6BA368" }}>
              <path d="M2 7.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>Completed a trail</p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>3h 40m · 8.6 km</p>
          </div>
          <span className="ml-auto text-[10px]" style={{ color: "var(--text-muted)" }}>2h ago</span>
        </div>
        <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--card-border)" }}>
          <button
            onClick={onPropose}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-[12px] font-semibold transition-opacity hover:opacity-85"
            style={{ background: "var(--surface-inset)", color: "var(--summit-green)" }}
          >
            + Propose a trail
          </button>
        </div>
      </div>
    </aside>
  );
}

// ── Recommended Row ──────────────────────────────────────────────────────────

const CARD_W = 276; // 260px card + 16px gap

function RecommendedRow({ trails }: { trails: Trail[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(dir: -1 | 1) {
    scrollRef.current?.scrollBy({ left: dir * CARD_W * 2, behavior: "smooth" });
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[18px] font-semibold" style={{ color: "var(--text-primary)" }}>
          Recommended for You
        </h2>
        <div className="flex items-center gap-2">
          <button
            className="text-[12px] font-medium transition-opacity hover:opacity-70"
            style={{ color: "var(--summit-green)" }}
          >
            View all
          </button>
          <div className="flex gap-1">
            {([[-1, "←"], [1, "→"]] as const).map(([dir, ch]) => (
              <button
                key={ch}
                onClick={() => scroll(dir)}
                className="flex h-7 w-7 items-center justify-center rounded-full border text-xs transition-colors hover:bg-[var(--surface-inset)]"
                style={{ borderColor: "var(--card-border)", color: "var(--text-muted)" }}
                aria-label={dir === -1 ? "Scroll left" : "Scroll right"}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        {trails.map((trail) => (
          <div key={trail.slug} className="w-[260px] shrink-0 snap-start">
            <TrailCard trail={trail} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Top Rated List ────────────────────────────────────────────────────────────

const DIFFICULTIES: Difficulty[] = ["easy", "moderate", "hard", "expert"];

function TopRatedList({ trails }: { trails: Trail[] }) {
  const [diff, setDiff] = useState<Difficulty | "all">("all");
  const { lang } = useI18n();

  const sorted = [...trails]
    .filter((t) => diff === "all" || t.difficulty === diff)
    .sort((a, b) => {
      const ra = parseFloat((4.0 + (slugHash(a.slug) % 10) * 0.1).toFixed(1));
      const rb = parseFloat((4.0 + (slugHash(b.slug) % 10) * 0.1).toFixed(1));
      return rb - ra;
    })
    .slice(0, 8);

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[18px] font-semibold" style={{ color: "var(--text-primary)" }}>
          Top Rated Trails
        </h2>
        {/* Filter tabs */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setDiff("all")}
            className="rounded-full px-4 py-1.5 text-[12px] font-medium transition-colors"
            style={diff === "all"
              ? { background: "var(--text-primary)", color: "var(--background)" }
              : { background: "var(--surface-inset)", color: "var(--text-muted)" }
            }
          >
            All
          </button>
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setDiff(d)}
              className="rounded-full px-4 py-1.5 text-[12px] font-medium transition-colors capitalize"
              style={diff === d
                ? { background: DIFF_BADGE[d], color: "#fff" }
                : { background: "var(--surface-inset)", color: "var(--text-muted)" }
              }
            >
              {DIFF_LABEL[d]}
            </button>
          ))}
        </div>
      </div>

      <div
        className="overflow-hidden rounded-2xl border"
        style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}
      >
        {sorted.map((trail, i) => {
          const name   = lang === "sq" && trail.sq?.name   ? trail.sq.name   : trail.name;
          const region = lang === "sq" && trail.sq?.region ? trail.sq.region : trail.region;
          const { score, count } = fakeRating(trail.slug);
          const h = slugHash(trail.slug);
          const MINI_GRAD: Record<string, string> = {
            easy:     "linear-gradient(135deg, #1A3D2B, #3D7854)",
            moderate: "linear-gradient(135deg, #3C1800, #9A5012)",
            hard:     "linear-gradient(135deg, #2A0606, #8C1C1C)",
            expert:   "linear-gradient(135deg, #06080F, #1C2545)",
          };

          return (
            <Link
              key={trail.slug}
              href={`/trails/${trail.slug}`}
              className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--hover-overlay)]"
              style={{ borderBottom: i < sorted.length - 1 ? "1px solid var(--card-border)" : "none" }}
            >
              {/* Rank */}
              <span
                className="w-6 shrink-0 text-center text-[13px] font-bold"
                style={{ color: i < 3 ? "var(--accent, #E68A2E)" : "var(--text-muted)" }}
              >
                {i + 1}
              </span>

              {/* Mini image */}
              <div
                className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl"
                style={{ background: MINI_GRAD[trail.difficulty] }}
              >
                <svg viewBox="0 0 48 48" className="absolute bottom-0 w-full" style={{ height: 28 }} aria-hidden>
                  <path
                    d={`M0,48 L0,${28 - (h % 8)} L${12 + (h % 4)},${14 + (h % 6)} L${22 + (h % 4)},${22 + (h % 4)} L${30 + (h % 3)},${10 + (h % 6)} L${38 + (h % 3)},${18 + (h % 4)} L48,${12 + (h % 6)} L48,48 Z`}
                    fill="rgba(0,0,0,0.30)"
                  />
                </svg>
              </div>

              {/* Trail info */}
              <div className="flex-1 min-w-0">
                <p className="truncate text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>{name}</p>
                <div className="mt-0.5 flex items-center gap-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
                  <svg width="9" height="9" viewBox="0 0 12 14" fill="none" aria-hidden>
                    <path d="M6 13C4 10.5 1.5 8.8 1.5 5.5a4.5 4.5 0 0 1 9 0C10.5 8.8 8 10.5 6 13Z" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                  {region}
                </div>
              </div>

              {/* Difficulty */}
              <span
                className="hidden sm:inline-block shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                style={{ background: DIFF_BADGE[trail.difficulty] }}
              >
                {DIFF_LABEL[trail.difficulty]}
              </span>

              {/* Stats */}
              <div className="hidden md:flex items-center gap-4 text-[12px] tabular-nums shrink-0" style={{ color: "var(--text-muted)" }}>
                <span>{trail.distanceKm} km</span>
                <span>{trail.ascentM} m</span>
                <span>{trail.durationHours}h</span>
              </div>

              {/* Rating */}
              <div className="flex shrink-0 items-center gap-1 text-[12px]">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="#E68A2E" aria-hidden>
                  <path d="M7 1l1.5 3.5L12 5l-2.5 2.5.6 3.5L7 9.5l-3.1 1.5.6-3.5L2 5l3.5-.5L7 1Z" />
                </svg>
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{score}</span>
                <span style={{ color: "var(--text-muted)" }}>({count})</span>
              </div>
            </Link>
          );
        })}
        {sorted.length === 0 && (
          <p className="py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            No trails found.
          </p>
        )}
      </div>
    </section>
  );
}

// ── Main HomeClient ───────────────────────────────────────────────────────────

export default function HomeClient({
  trails,
  initialQuery = "",
}: {
  trails: Trail[];
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [computedAscents, setComputedAscents] = useState<Record<string, number>>({});
  const t = useT();

  // Compute elevation for trails that have ascentM === 0 (OSM-imported trails
  // without server-side enrichment). Processes sequentially to be polite to the API.
  useEffect(() => {
    const missing = trails.filter((t) => t.ascentM === 0 && t.geometry.length >= 2);
    if (missing.length === 0) return;
    const ctrl = new AbortController();
    async function run() {
      for (const trail of missing) {
        if (ctrl.signal.aborted) break;
        const profile = await buildElevationProfile(trail.geometry, ctrl.signal);
        if (profile && profile.totalAscentM > 0) {
          setComputedAscents((prev) => ({ ...prev, [trail.slug]: Math.round(profile.totalAscentM) }));
        }
      }
    }
    void run();
    return () => ctrl.abort();
  }, [trails]);

  // Merge computed ascents back into trail objects so all child components get consistent data.
  const enrichedTrails = trails.map((t) =>
    computedAscents[t.slug] !== undefined ? { ...t, ascentM: computedAscents[t.slug] } : t,
  );

  const heroTrails = enrichedTrails.slice(0, 3);
  const activeFeatured = heroTrails[heroIndex] ?? heroTrails[0];

  // Filtered trail list for the recommended section
  const recommended = enrichedTrails.slice(0, 6);

  // Filtered for search
  const filtered = query.trim()
    ? enrichedTrails.filter((trail) => {
        const q = query.toLowerCase();
        return trail.name.toLowerCase().includes(q) || trail.region.toLowerCase().includes(q);
      })
    : null;

  return (
    <div className="flex flex-1 flex-col overflow-x-clip">

      {/* Search results overlay */}
      {filtered && (
        <div className="mx-auto w-full max-w-5xl px-5 pt-6 pb-4">
          <p className="mb-4 text-sm" style={{ color: "var(--text-muted)" }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{query}"
          </p>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((trail) => (
              <li key={trail.slug}><TrailCard trail={trail} /></li>
            ))}
          </ul>
          {filtered.length === 0 && (
            <p className="py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              {t.noTrailsFound}
            </p>
          )}
        </div>
      )}

      {/* Main content (hidden when searching) */}
      {!filtered && (
        <div className="flex flex-1 gap-6 px-6 pt-6 pb-10">
          {/* Center column */}
          <div className="flex-1 min-w-0 flex flex-col gap-8">
            {/* Featured hero */}
            {heroTrails.length > 0 && <FeaturedHero trails={heroTrails} onActiveChange={setHeroIndex} />}

            {/* Recommended for You */}
            <RecommendedRow trails={recommended} />

            {/* Top Rated */}
            <TopRatedList trails={enrichedTrails} />

            {/* All Trails with filters */}
            <TrailList trails={enrichedTrails} query={query} />
          </div>

          {/* Right panel */}
          <RightPanel onPropose={() => setProposeOpen(true)} trailhead={activeFeatured?.trailhead} featuredSlug={activeFeatured?.slug} />
        </div>
      )}

      {proposeOpen && <TrailProposalModal onClose={() => setProposeOpen(false)} />}
    </div>
  );
}
