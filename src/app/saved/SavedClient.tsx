"use client";

import TrailCard from "@/components/TrailCard";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useI18n } from "@/lib/i18n/context";
import type { Trail } from "@/lib/types";
import Link from "next/link";

function SkeletonCard() {
  return (
    <div
      className="rounded-3xl"
      style={{ minHeight: "260px", background: "var(--card-bg)", border: "1px solid var(--card-border)", animation: "pulse 1.5s ease-in-out infinite" }}
    />
  );
}

export default function SavedClient({ trails }: { trails: Trail[] }) {
  const { t } = useI18n();
  const { bookmarks, loading } = useBookmarks();

  const savedTrails = trails.filter((trail) => bookmarks.has(trail.slug));

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-5 py-10">
        <h1 className="mb-8 font-display text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          {t.savedHeading}
        </h1>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <SkeletonCard />
            </li>
          ))}
        </ul>
      </main>
    );
  }

  if (savedTrails.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-5 py-24 text-center">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
          <path
            d="M10 6h28a2 2 0 0 1 2 2v32l-16-9-16 9V8a2 2 0 0 1 2-2Z"
            stroke="var(--text-muted)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </svg>
        <h1 className="font-display text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          {t.savedHeading}
        </h1>
        <p className="max-w-sm text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {t.savedEmpty}
        </p>
        <Link
          href="/"
          className="mt-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-85 sm:rounded-full"
          style={{ background: "var(--btn-primary)", color: "var(--btn-primary-text)" }}
        >
          {t.allTrails}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10">
      <h1 className="mb-8 font-display text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
        {t.savedHeading}
      </h1>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {savedTrails.map((trail) => (
          <li key={trail.slug}>
            <TrailCard trail={trail} />
          </li>
        ))}
      </ul>
    </main>
  );
}
