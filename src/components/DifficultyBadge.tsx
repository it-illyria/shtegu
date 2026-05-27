"use client";

import type { Difficulty } from "@/lib/types";
import { useT } from "@/lib/i18n/context";

export default function DifficultyBadge({ level }: { level: Difficulty }) {
  const t = useT();
  const label: Record<Difficulty, string> = {
    easy:     t.easy,
    moderate: t.moderate,
    hard:     t.hard,
    expert:   t.expert,
  };
  return (
    <span
      style={{ background: `var(--badge-${level})` }}
      className="inline-block shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm"
    >
      {label[level]}
    </span>
  );
}
