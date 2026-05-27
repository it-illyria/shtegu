"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n, interp } from "@/lib/i18n/context";
import { GEAR_CATEGORIES, ALL_ITEM_IDS } from "./gear-data";

const STORAGE_KEY = "shtegu_gear_checked";

function loadChecked(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveChecked(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {}
}

export default function GearClient() {
  const { lang, t } = useI18n();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setChecked(loadChecked());
    setMounted(true);
  }, []);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      saveChecked(next);
      return next;
    });
  }

  function reset() {
    const empty = new Set<string>();
    saveChecked(empty);
    setChecked(empty);
  }

  const totalItems = ALL_ITEM_IDS.length;
  const doneCount = ALL_ITEM_IDS.filter((id) => checked.has(id)).length;
  const allDone = doneCount === totalItems;
  const progressPct = totalItems > 0 ? (doneCount / totalItems) * 100 : 0;

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10">
      {/* Back link */}
      <Link href="/" className="text-sm hover:underline" style={{ color: "var(--text-muted)" }}>
        {t.gearBackHome}
      </Link>

      {/* Header */}
      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <h1
            className="font-display text-3xl font-bold tracking-[-0.02em]"
            style={{ color: "var(--text-primary)" }}
          >
            {t.gearHeading}
          </h1>
          <p className="mt-1 text-[15px]" style={{ color: "var(--text-muted)" }}>
            {t.gearSubheading}
          </p>
        </div>
        {mounted && doneCount > 0 && (
          <button
            onClick={reset}
            className="mt-1 shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
            style={{ background: "var(--surface-inset)", color: "var(--text-muted)" }}
          >
            {t.gearReset}
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-[13px]">
          <span style={{ color: "var(--text-muted)" }}>
            {mounted ? interp(t.gearProgress, { done: doneCount, total: totalItems }) : ""}
          </span>
          {mounted && allDone && (
            <span className="font-medium" style={{ color: "var(--summit-green)" }}>
              {t.gearAllDone}
            </span>
          )}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-inset)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, background: allDone ? "#6BA368" : "var(--summit-green)" }}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="mt-8 flex flex-col gap-5">
        {GEAR_CATEGORIES.map((cat) => {
          const catDone = cat.items.filter((i) => checked.has(i.id)).length;
          const catComplete = catDone === cat.items.length;

          return (
            <section
              key={cat.id}
              className="overflow-hidden rounded-2xl border"
              style={{ borderColor: catComplete ? "#6BA368" : "var(--card-border)", background: "var(--card-bg)" }}
            >
              {/* Category header */}
              <div
                className="flex items-center justify-between px-5 py-3.5"
                style={{ borderBottom: "1px solid var(--card-border)" }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl leading-none" aria-hidden>{cat.emoji}</span>
                  <span className="text-[15px] font-semibold" style={{ color: catComplete ? "#4A8A46" : "var(--text-primary)" }}>
                    {lang === "sq" ? cat.sq : cat.en}
                  </span>
                </div>
                <span className="text-[12px] font-medium" style={{ color: catComplete ? "#6BA368" : "var(--text-muted)" }}>
                  {mounted ? interp(t.gearItemsOf, { done: catDone, total: cat.items.length }) : `0/${cat.items.length}`}
                </span>
              </div>

              {/* Items */}
              <ul>
                {cat.items.map((item, idx) => {
                  const isChecked = mounted && checked.has(item.id);
                  return (
                    <li
                      key={item.id}
                      style={{ borderTop: idx > 0 ? "1px solid var(--card-border)" : undefined }}
                    >
                      <label
                        className="flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors hover:bg-[var(--hover-overlay)]"
                      >
                        {/* Custom checkbox */}
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all"
                          style={{
                            borderColor: isChecked ? "var(--summit-green)" : "var(--card-border)",
                            background: isChecked ? "var(--summit-green)" : "transparent",
                          }}
                        >
                          {isChecked && (
                            <svg width="11" height="9" viewBox="0 0 11 9" fill="none" aria-hidden>
                              <path d="M1 4.5l3 3 6-7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isChecked}
                          onChange={() => toggle(item.id)}
                          aria-label={lang === "sq" ? item.sq : item.en}
                        />
                        <span
                          className="text-[14px] leading-snug"
                          style={{
                            color: isChecked ? "var(--text-muted)" : "var(--text-primary)",
                            textDecoration: isChecked ? "line-through" : "none",
                          }}
                        >
                          {lang === "sq" ? item.sq : item.en}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
