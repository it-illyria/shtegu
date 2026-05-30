"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { Trail, Difficulty } from "@/lib/types";
import { useI18n, useT } from "@/lib/i18n/context";
import { buildElevationProfile } from "@/lib/elevation";
import SeasonCalendar from "@/components/SeasonCalendar";

// ── Difficulty colours / labels ───────────────────────────────────────────────

const DIFF_COLOR: Record<Difficulty, string> = {
  easy:     "#6BA368",
  moderate: "#D9A441",
  hard:     "#C96B4B",
  expert:   "#8A3E3E",
};

// ── Localised field helpers ───────────────────────────────────────────────────

function name(t: Trail, lang: string) { return lang === "sq" && t.sq?.name   ? t.sq.name   : t.name; }
function region(t: Trail, lang: string) { return lang === "sq" && t.sq?.region ? t.sq.region : t.region; }
function summary(t: Trail, lang: string) { return lang === "sq" && t.sq?.summary ? t.sq.summary : t.summary; }
function season(t: Trail, lang: string) {
  const raw = lang === "sq" && t.sq?.bestMonths ? t.sq.bestMonths : t.bestMonths;
  return raw === "TODO" ? "" : (raw ?? "");
}

// ── Trail Picker ──────────────────────────────────────────────────────────────

function TrailPicker({
  trails, selected, onSelect, label, lang, excludeSlug,
}: {
  trails: Trail[]; selected: Trail | null; onSelect: (t: Trail | null) => void;
  label: string; lang: string; excludeSlug?: string;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [open, setOpen]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = trails.filter((tr) => {
    if (tr.slug === excludeSlug) return false;
    const q = query.toLowerCase();
    return name(tr, lang).toLowerCase().includes(q) || region(tr, lang).toLowerCase().includes(q);
  });

  function pick(tr: Trail) { onSelect(tr); setQuery(""); setOpen(false); }
  function clear() { onSelect(null); setQuery(""); setOpen(false); }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <div className="flex items-center gap-1 rounded-xl px-3 py-2" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <input
          type="text"
          placeholder={t.comparePickPlaceholder}
          value={selected ? name(selected, lang) : query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); if (selected) onSelect(null); }}
          onFocus={() => setOpen(true)}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:opacity-60"
          style={{ color: "var(--text-primary)" }}
        />
        {(selected || query) && (
          <button onClick={clear} aria-label="Clear" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs" style={{ background: "var(--surface-inset)", color: "var(--text-muted)" }}>×</button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <ul className="absolute left-0 right-0 z-20 mt-1 overflow-y-auto rounded-xl py-1 shadow-lg" style={{ maxHeight: "12rem", background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          {filtered.map((tr) => (
            <li key={tr.slug}>
              <button
                className="w-full px-3 py-2 text-left text-sm transition-colors"
                style={{ color: "var(--text-primary)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-inset)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                onClick={() => pick(tr)}
              >
                <span className="font-medium">{name(tr, lang)}</span>
                <span className="ml-1.5 text-xs" style={{ color: "var(--text-muted)" }}>{region(tr, lang)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && query && filtered.length === 0 && (
        <div className="absolute left-0 right-0 z-20 mt-1 rounded-xl px-3 py-3 text-sm shadow-lg" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--text-muted)" }}>
          {t.compareNoTrails}
        </div>
      )}
    </div>
  );
}

// ── Comparison table ──────────────────────────────────────────────────────────

function CompareTable({ a, b, lang, ascentA, ascentB }: {
  a: Trail; b: Trail; lang: string; ascentA: number; ascentB: number;
}) {
  const t = useT();

  const diffLabel = (d: Difficulty) => ({ easy: t.easy, moderate: t.moderate, hard: t.hard, expert: t.expert }[d]);

  const rows: { label: string; cellA: React.ReactNode; cellB: React.ReactNode }[] = [
    {
      label: t.compareDistance,
      cellA: <strong>{a.distanceKm} km</strong>,
      cellB: <strong>{b.distanceKm} km</strong>,
    },
    {
      label: t.compareAscent,
      cellA: <strong>{ascentA.toLocaleString()} m</strong>,
      cellB: <strong>{ascentB.toLocaleString()} m</strong>,
    },
    {
      label: t.compareDuration,
      cellA: <>{a.durationHours} h</>,
      cellB: <>{b.durationHours} h</>,
    },
    {
      label: t.compareDifficulty,
      cellA: (
        <span className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white" style={{ background: DIFF_COLOR[a.difficulty] }}>
          {diffLabel(a.difficulty)}
        </span>
      ),
      cellB: (
        <span className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white" style={{ background: DIFF_COLOR[b.difficulty] }}>
          {diffLabel(b.difficulty)}
        </span>
      ),
    },
    {
      label: t.compareSeason,
      cellA: season(a, lang) ? <SeasonCalendar bestMonths={a.bestMonths} /> : <span style={{ color: "var(--text-muted)" }}>—</span>,
      cellB: season(b, lang) ? <SeasonCalendar bestMonths={b.bestMonths} /> : <span style={{ color: "var(--text-muted)" }}>—</span>,
    },
    {
      label: t.compareRegion,
      cellA: <>{region(a, lang)}</>,
      cellB: <>{region(b, lang)}</>,
    },
    {
      label: t.compareDescription,
      cellA: <span className="line-clamp-2 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{summary(a, lang)}</span>,
      cellB: <span className="line-clamp-2 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{summary(b, lang)}</span>,
    },
  ];

  return (
    <>
      {/* Mobile: two stacked cards, one per trail */}
      <div className="flex flex-col gap-4 sm:hidden">
        {[a, b].map((tr, idx) => {
          const ascent = idx === 0 ? ascentA : ascentB;
          return (
            <div key={tr.slug} className="overflow-hidden rounded-2xl" style={{ border: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
              <div className="px-4 py-3" style={{ background: "var(--surface-inset)", borderBottom: "1px solid var(--card-border)" }}>
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  {idx === 0 ? t.comparePickFirst : t.comparePickSecond}
                </p>
                <p className="mt-0.5 truncate text-base font-bold" style={{ color: "var(--text-primary)" }}>{name(tr, lang)}</p>
                <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>{region(tr, lang)}</p>
              </div>
              <dl>
                {rows.map((row, rIdx) => (
                  <div key={row.label} className="grid grid-cols-[40%_60%]" style={{ borderTop: rIdx > 0 ? "1px solid var(--card-border)" : undefined }}>
                    <dt className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide" style={{ background: "var(--surface-inset)", color: "var(--text-muted)" }}>
                      {row.label}
                    </dt>
                    <dd className="px-4 py-2.5 text-sm" style={{ color: "var(--text-primary)" }}>
                      {idx === 0 ? row.cellA : row.cellB}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>

      {/* Desktop: side-by-side comparison table */}
      <div className="hidden overflow-hidden rounded-2xl sm:block" style={{ border: "1px solid var(--card-border)" }}>
        <div className="grid grid-cols-3" style={{ borderBottom: "1px solid var(--card-border)" }}>
          <div className="px-4 py-3" style={{ background: "var(--surface-inset)", borderRight: "1px solid var(--card-border)" }} />
          {[a, b].map((tr, i) => (
            <div key={tr.slug} className="px-4 py-3" style={{ background: "var(--surface-inset)", borderRight: i === 0 ? "1px solid var(--card-border)" : undefined }}>
              <p className="truncate text-sm font-bold" style={{ color: "var(--text-primary)" }}>{name(tr, lang)}</p>
              <p className="mt-0.5 truncate text-[11px]" style={{ color: "var(--text-muted)" }}>{region(tr, lang)}</p>
            </div>
          ))}
        </div>

        {rows.map((row, idx) => (
          <div key={row.label} className="grid grid-cols-3" style={{ borderBottom: idx < rows.length - 1 ? "1px solid var(--card-border)" : undefined }}>
            <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ background: "var(--surface-inset)", color: "var(--text-muted)", borderRight: "1px solid var(--card-border)" }}>
              {row.label}
            </div>
            <div className="px-4 py-3 text-sm" style={{ color: "var(--text-primary)", background: "var(--card-bg)", borderRight: "1px solid var(--card-border)" }}>
              {row.cellA}
            </div>
            <div className="px-4 py-3 text-sm" style={{ color: "var(--text-primary)", background: "var(--card-bg)" }}>
              {row.cellB}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CompareClient({ trails }: { trails: Trail[] }) {
  const { lang } = useI18n();
  const t = useT();
  const [trailA, setTrailA] = useState<Trail | null>(null);
  const [trailB, setTrailB] = useState<Trail | null>(null);
  const [computedAscents, setComputedAscents] = useState<Record<string, number>>({});

  // Compute elevation for selected trails with ascentM === 0
  useEffect(() => {
    const toCompute = [trailA, trailB].filter(
      (tr): tr is Trail => tr !== null && tr.ascentM === 0 && tr.geometry.length >= 2 && !(tr.slug in computedAscents),
    );
    if (toCompute.length === 0) return;
    const ctrl = new AbortController();
    async function run() {
      for (const tr of toCompute) {
        if (ctrl.signal.aborted) break;
        const profile = await buildElevationProfile(tr.geometry, ctrl.signal);
        if (profile && profile.totalAscentM > 0) {
          setComputedAscents((prev) => ({ ...prev, [tr.slug]: Math.round(profile.totalAscentM) }));
        }
      }
    }
    void run();
    return () => ctrl.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trailA?.slug, trailB?.slug]);

  function resolvedAscent(tr: Trail) {
    return computedAscents[tr.slug] ?? tr.ascentM;
  }

  const bothSelected = trailA !== null && trailB !== null;

  return (
    <main className="mx-auto w-full max-w-4xl px-3 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <Link
        href="/"
        className="text-sm hover:underline"
        style={{ color: "var(--text-muted)" }}
      >
        {t.compareBackHome}
      </Link>
      <div className="mt-3 mb-2">
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em] sm:text-3xl" style={{ color: "var(--text-primary)" }}>
          {t.compareHeading}
        </h1>
        <p className="mt-1 text-[15px]" style={{ color: "var(--text-muted)" }}>{t.compareSubheading}</p>
      </div>

      {/* Pickers */}
      <div className="my-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TrailPicker trails={trails} selected={trailA} onSelect={setTrailA} label={t.comparePickFirst} lang={lang} excludeSlug={trailB?.slug} />
        <TrailPicker trails={trails} selected={trailB} onSelect={setTrailB} label={t.comparePickSecond} lang={lang} excludeSlug={trailA?.slug} />
      </div>

      {/* Table or empty state */}
      {bothSelected ? (
        <CompareTable a={trailA} b={trailB} lang={lang} ascentA={resolvedAscent(trailA)} ascentB={resolvedAscent(trailB)} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl px-6 py-20 text-center" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden className="mb-4 opacity-40">
            <rect x="4" y="8" width="17" height="32" rx="3" stroke="var(--text-muted)" strokeWidth="2.5" />
            <rect x="27" y="8" width="17" height="32" rx="3" stroke="var(--text-muted)" strokeWidth="2.5" />
            <line x1="12" y1="18" x2="12" y2="30" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
            <line x1="36" y1="18" x2="36" y2="30" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t.compareEmptyState}</p>
        </div>
      )}
    </main>
  );
}
