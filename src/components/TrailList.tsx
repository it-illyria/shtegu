"use client";

import { useMemo, useState } from "react";
import type { Difficulty, Trail } from "@/lib/types";
import TrailCard from "@/components/TrailCard";
import TrailProposalModal from "@/components/TrailProposalModal";

import { useI18n, interp } from "@/lib/i18n/context";

const DIFFICULTIES: Difficulty[] = ["easy", "moderate", "hard", "expert"];

const DIFF_ACCENT: Record<Difficulty, string> = {
  easy:     "var(--badge-easy)",
  moderate: "var(--badge-moderate)",
  hard:     "var(--badge-hard)",
  expert:   "var(--badge-expert)",
};

const REGIONS = [
  "Rajoni Verior & Verilindor",
  "Rajoni Perëndimor",
  "Rajoni Juglindor",
  "Rajoni Jugor",
] as const;

const REGION_COLOR: Record<string, string> = {
  "Rajoni Verior & Verilindor": "#3B82F6",
  "Rajoni Perëndimor":          "#10B981",
  "Rajoni Juglindor":           "#F59E0B",
  "Rajoni Jugor":               "#F43F5E",
};

const PAGE_SIZE = 12;

export default function TrailList({ trails, query = "" }: { trails: Trail[]; query?: string }) {
  const { lang, t } = useI18n();
  const [diff,   setDiff]   = useState<Difficulty | "all">("all");
  const [region, setRegion] = useState<string>("all");
  const [page,   setPage]   = useState(1);
  const [proposeOpen, setProposeOpen] = useState(false);

  function resetPage() { setPage(1); }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return trails.filter((trail) => {
      if (diff   !== "all" && trail.difficulty !== diff)   return false;
      if (region !== "all" && trail.region     !== region) return false;
      if (!q) return true;
      const name_    = lang === "sq" && trail.sq?.name    ? trail.sq.name    : trail.name;
      const reg_     = lang === "sq" && trail.sq?.region  ? trail.sq.region  : trail.region;
      const summary_ = lang === "sq" && trail.sq?.summary ? trail.sq.summary : trail.summary;
      return (
        name_.toLowerCase().includes(q) ||
        reg_.toLowerCase().includes(q) ||
        summary_.toLowerCase().includes(q)
      );
    });
  }, [trails, query, diff, region, lang]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageItems  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const diffLabels: Record<Difficulty, string> = {
    easy: t.easy, moderate: t.moderate, hard: t.hard, expert: t.expert,
  };

  const regionLabels: Record<string, string> = {
    "Rajoni Verior & Verilindor": t.regionNorth,
    "Rajoni Perëndimor":          t.regionWest,
    "Rajoni Juglindor":           t.regionSouthEast,
    "Rajoni Jugor":               t.regionSouth,
  };

  return (
    <div className="flex items-start gap-6">

      {/* ── LEFT: Filter sidebar (desktop only) ──────────────────── */}
      <aside
        className="hidden lg:flex w-44 shrink-0 flex-col gap-5 sticky top-4 self-start rounded-2xl p-3"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
      >
        {/* Difficulty */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>
            {t.filterDifficultyLabel}
          </p>
          <div className="flex flex-col gap-1">
            <SidebarItem
              active={diff === "all"}
              onClick={() => { setDiff("all"); resetPage(); }}
              activeStyle={{ background: "var(--text-primary)", color: "var(--background)" }}
            >
              {t.allDifficulties}
            </SidebarItem>
            {DIFFICULTIES.map((d) => (
              <SidebarItem
                key={d}
                active={diff === d}
                onClick={() => { setDiff(d); resetPage(); }}
                activeStyle={{ background: DIFF_ACCENT[d], color: "#fff" }}
              >
                {diffLabels[d]}
              </SidebarItem>
            ))}
          </div>
        </div>

        {/* Region */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>
            {t.filterRegionLabel}
          </p>
          <div className="flex flex-col gap-1">
            <SidebarItem
              active={region === "all"}
              onClick={() => { setRegion("all"); resetPage(); }}
              activeStyle={{ background: "var(--text-primary)", color: "var(--background)" }}
            >
              {t.filterAllRegions}
            </SidebarItem>
            {REGIONS.map((r) => (
              <SidebarItem
                key={r}
                active={region === r}
                onClick={() => { setRegion(r); resetPage(); }}
                activeStyle={{ background: REGION_COLOR[r], color: "#fff" }}
              >
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: REGION_COLOR[r], opacity: region === r ? 0 : 1 }} />
                  {regionLabels[r]}
                </span>
              </SidebarItem>
            ))}
          </div>
        </div>
      </aside>

      {/* ── CENTER: Trail grid ────────────────────────────────────── */}
      <div className="flex-1 min-w-0">

        {/* Mobile filters — sticky so they stay visible while scrolling through pages */}
        <div
          className="lg:hidden sticky top-0 z-20 -mx-5 mb-5 flex flex-col gap-2.5 px-5 pb-3 pt-3"
          style={{
            background: "var(--background)",
            borderBottom: "1px solid var(--card-border)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <div className="flex flex-wrap gap-2">
            <Pill active={diff === "all"} onClick={() => { setDiff("all"); resetPage(); }} activeStyle={{ background: "var(--text-primary)", color: "var(--background)", borderColor: "var(--text-primary)" }}>
              {t.allDifficulties}
            </Pill>
            {DIFFICULTIES.map((d) => (
              <Pill key={d} active={diff === d} onClick={() => { setDiff(d); resetPage(); }} activeStyle={{ background: DIFF_ACCENT[d], color: "#fff", borderColor: DIFF_ACCENT[d] }}>
                {diffLabels[d]}
              </Pill>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill active={region === "all"} onClick={() => { setRegion("all"); resetPage(); }} activeStyle={{ background: "var(--text-primary)", color: "var(--background)", borderColor: "var(--text-primary)" }}>
              {t.filterAllRegions}
            </Pill>
            {REGIONS.map((r) => (
              <Pill key={r} active={region === r} onClick={() => { setRegion(r); resetPage(); }} activeStyle={{ background: REGION_COLOR[r], color: "#fff", borderColor: REGION_COLOR[r] }}>
                {regionLabels[r]}
              </Pill>
            ))}
          </div>
        </div>

        {/* Trail count */}
        <p className="mb-4 text-xs" style={{ color: "var(--text-muted)" }}>
          {interp(t.trailCount, { filtered: filtered.length, total: trails.length })}
        </p>

        {/* Cards */}
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {pageItems.map((trail) => (
            <li key={trail.slug}>
              <TrailCard trail={trail} />
            </li>
          ))}
          {filtered.length === 0 && (
            <li
              className="col-span-full flex flex-col items-center gap-3 py-16 text-center"
              style={{ color: "var(--text-muted)" }}
            >
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
                <path
                  d="M4 36 L4 26 L12 14 L18 22 L24 8 L32 18 L36 14 L36 36 Z"
                  stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none"
                />
              </svg>
              <p className="text-sm">{t.noTrailsFound}</p>
            </li>
          )}
        </ul>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-1">
            <PageBtn
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-label="Faqja e mëparshme"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </PageBtn>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…" ? (
                  <span key={`gap-${i}`} className="w-8 text-center text-xs" style={{ color: "var(--text-muted)" }}>…</span>
                ) : (
                  <PageBtn key={p} onClick={() => setPage(p as number)} active={p === safePage}>
                    {p}
                  </PageBtn>
                )
              )}

            <PageBtn
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              aria-label="Faqja tjetër"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M5 2L10 7L5 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </PageBtn>
          </div>
        )}

        {/* ── Propose a trail CTA ────────────────────────────────────── */}
        <div
          className="mt-10 rounded-2xl border px-6 py-5 text-center"
          style={{ borderColor: "var(--card-border)", background: "var(--surface-inset)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {t.proposeButton}?
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            {t.proposeModalDesc}
          </p>
          <button
            onClick={() => setProposeOpen(true)}
            className="mt-4 rounded-full px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-85"
            style={{ background: "var(--btn-primary)", color: "var(--btn-primary-text)" }}
          >
            + {t.proposeButton}
          </button>
        </div>
      </div>

      {proposeOpen && (
        <TrailProposalModal onClose={() => setProposeOpen(false)} />
      )}
    </div>
  );
}

// ── Sidebar menu item ──────────────────────────────────────────────────────
function SidebarItem({
  active, onClick, activeStyle, children,
}: {
  active: boolean;
  onClick: () => void;
  activeStyle: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors"
      style={
        active
          ? activeStyle
          : { background: "transparent", color: "var(--text-muted)" }
      }
    >
      {children}
    </button>
  );
}

// ── Pagination button ──────────────────────────────────────────────────────
function PageBtn({
  children, onClick, disabled, active, ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-sm font-medium transition-colors disabled:opacity-30"
      style={
        active
          ? { background: "var(--summit-green)", color: "#fff", borderColor: "var(--summit-green)" }
          : { background: "var(--card-bg)", color: "var(--text-muted)", borderColor: "var(--card-border)" }
      }
      {...rest}
    >
      {children}
    </button>
  );
}

// ── Mobile pill button ─────────────────────────────────────────────────────
function Pill({
  active, onClick, activeStyle, children,
}: {
  active: boolean;
  onClick: () => void;
  activeStyle: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border px-3.5 py-1 text-xs font-medium transition-colors"
      style={
        active
          ? activeStyle
          : { background: "transparent", color: "var(--text-muted)", borderColor: "var(--card-border)" }
      }
    >
      {children}
    </button>
  );
}
