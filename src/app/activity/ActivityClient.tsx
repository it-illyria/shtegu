"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/lib/i18n/context";
import AuthButton from "@/components/AuthButton";
import type { Trail, Difficulty } from "@/lib/types";

interface ActivityRow {
  id: string;
  trail_slug: string;
  completed_at: string;
  duration_min: number | null;
  notes: string | null;
  created_at: string;
}

const BADGE_COLOR: Record<Difficulty, string> = {
  easy: "#6BA368",
  moderate: "#D9A441",
  hard: "#C96B4B",
  expert: "#8A3E3E",
};

const BADGE_LABEL: Record<Difficulty, { en: string; sq: string }> = {
  easy: { en: "Easy", sq: "E lehtë" },
  moderate: { en: "Moderate", sq: "Mesatare" },
  hard: { en: "Hard", sq: "E vështirë" },
  expert: { en: "Expert", sq: "Ekspert" },
};

/** Compute longest streak (consecutive calendar days with at least one activity). */
function longestStreak(activities: ActivityRow[]): number {
  if (activities.length === 0) return 0;
  const days = Array.from(new Set(activities.map((a) => a.completed_at))).sort();
  let best = 1;
  let current = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86_400_000;
    if (diff === 1) {
      current++;
      if (current > best) best = current;
    } else {
      current = 1;
    }
  }
  return best;
}

// Mountain icon for empty state
function MountainIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden>
      <path
        d="M8 44 L22 20 L30 32 L36 24 L48 44 Z"
        stroke="var(--text-muted)"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="40" cy="14" r="4" stroke="var(--text-muted)" strokeWidth="2" fill="none" />
    </svg>
  );
}

function ActivityInner({ trails }: { trails: Trail[] }) {
  const { lang, t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const signedIn = Boolean(user && !user.is_anonymous);
  const searchParams = useSearchParams();

  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Pre-fill trail from ?trail= URL param (e.g. from "Log this hike" button on trail page)
  const paramSlug = searchParams.get("trail") ?? "";
  const initialSlug = trails.find((tr) => tr.slug === paramSlug)?.slug ?? trails[0]?.slug ?? "";

  // Form state
  const [formOpen, setFormOpen] = useState(Boolean(paramSlug));
  const [selectedSlug, setSelectedSlug] = useState(initialSlug);
  const [searchQuery, setSearchQuery] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !user) return;
    setLoadingData(true);
    const { data } = await supabase
      .from("user_activities")
      .select("id,trail_slug,completed_at,duration_min,notes,created_at")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false });
    if (data) setActivities(data as ActivityRow[]);
    setLoadingData(false);
  }, [user]);

  useEffect(() => {
    if (signedIn) void load();
  }, [signedIn, load]);

  // Compute stats
  const trailMap = new Map(trails.map((tr) => [tr.slug, tr]));

  const totalHikes = activities.length;
  const totalKm = activities.reduce((sum, a) => {
    const tr = trailMap.get(a.trail_slug);
    return sum + (tr?.distanceKm ?? 0);
  }, 0);
  const totalAscent = activities.reduce((sum, a) => {
    const tr = trailMap.get(a.trail_slug);
    return sum + (tr?.ascentM ?? 0);
  }, 0);
  const streak = longestStreak(activities);

  // Filtered trail list for the picker
  const filteredTrails = searchQuery.trim()
    ? trails.filter((tr) =>
        tr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tr.sq?.name ?? "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : trails;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !user || !selectedSlug) return;
    setSubmitting(true);
    setFormError(null);
    const { error } = await supabase.from("user_activities").insert({
      user_id: user.id,
      trail_slug: selectedSlug,
      completed_at: date,
      duration_min: duration ? parseInt(duration, 10) : null,
      notes: notes.trim() || null,
    });
    if (error) {
      setFormError(error.message);
      setSubmitting(false);
      return;
    }
    setDuration("");
    setNotes("");
    setDate(new Date().toISOString().slice(0, 10));
    setFormOpen(false);
    setSubmitting(false);
    await load();
  }

  async function handleDelete(id: string) {
    if (!supabase) return;
    await supabase.from("user_activities").delete().eq("id", id);
    setActivities((prev) => prev.filter((a) => a.id !== id));
  }

  const inputStyle = {
    borderColor: "var(--input-border)",
    background: "var(--input-bg)",
    color: "var(--input-text)",
  };

  // Not signed in — show sign-in prompt
  if (!authLoading && !signedIn) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 py-16">
        <h1
          className="font-display text-2xl font-bold mb-8"
          style={{ color: "var(--text-primary)" }}
        >
          {t.activityHeading}
        </h1>
        <div
          className="rounded-2xl border p-8 flex flex-col items-center gap-5 text-center"
          style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}
        >
          <MountainIcon />
          <p className="text-sm max-w-xs" style={{ color: "var(--text-muted)" }}>
            {t.activitySignInPrompt}
          </p>
          <AuthButton />
        </div>
      </main>
    );
  }

  if (authLoading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 py-16">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10" id="activity-main">
      <h1
        className="font-display text-2xl font-bold mb-6"
        style={{ color: "var(--text-primary)" }}
      >
        {t.activityHeading}
      </h1>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-3 mb-8">
        {[
          { value: totalHikes, label: t.activityTotalHikes },
          { value: totalKm.toFixed(1), label: t.activityTotalKm },
          { value: Math.round(totalAscent).toLocaleString(), label: t.activityTotalAscent },
          { value: streak, label: t.activityStreak },
        ].map(({ value, label }) => (
          <div
            key={label}
            className="flex flex-col items-center rounded-2xl border px-5 py-3 min-w-[90px]"
            style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}
          >
            <span
              className="text-2xl font-bold tabular-nums"
              style={{ color: "var(--summit-green)" }}
            >
              {value}
            </span>
            <span className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Log a hike — collapsible form */}
      <div
        className="rounded-2xl border mb-8 overflow-hidden"
        style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}
      >
        <button
          type="button"
          onClick={() => setFormOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold transition-colors"
          style={{ color: "var(--text-primary)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--hover-overlay)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          }}
        >
          <span>{t.activityLogHike}</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden
            style={{
              transform: formOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          >
            <path
              d="M2 5l5 5 5-5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {formOpen && (
          <form onSubmit={handleSubmit} className="px-5 pb-5 pt-1 flex flex-col gap-3">
            {/* Trail picker with search */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="activity-trail-search"
                className="text-xs font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                {t.activityTrailLabel}
              </label>
              <input
                id="activity-trail-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={trails.find((tr) => tr.slug === selectedSlug)?.name ?? ""}
                className="rounded-lg border px-3 py-1.5 text-sm"
                style={inputStyle}
              />
              {searchQuery.trim() && (
                <ul
                  className="rounded-lg border mt-1 max-h-48 overflow-y-auto text-sm"
                  style={{
                    borderColor: "var(--card-border)",
                    background: "var(--card-bg)",
                    color: "var(--text-primary)",
                  }}
                >
                  {filteredTrails.length === 0 ? (
                    <li className="px-3 py-2 text-xs" style={{ color: "var(--text-muted)" }}>
                      No trails found
                    </li>
                  ) : (
                    filteredTrails.map((tr) => (
                      <li key={tr.slug}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:opacity-80 transition-opacity"
                          onClick={() => {
                            setSelectedSlug(tr.slug);
                            setSearchQuery("");
                          }}
                        >
                          {lang === "sq" && tr.sq?.name ? tr.sq.name : tr.name}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
              {/* Display currently selected trail when not searching */}
              {!searchQuery.trim() && selectedSlug && (
                <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {(() => {
                    const tr = trailMap.get(selectedSlug);
                    if (!tr) return null;
                    return lang === "sq" && tr.sq?.name ? tr.sq.name : tr.name;
                  })()}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Date */}
              <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                <label
                  htmlFor="activity-date"
                  className="text-xs font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  {t.activityDateLabel}
                </label>
                <input
                  id="activity-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="rounded-lg border px-3 py-1.5 text-sm"
                  style={inputStyle}
                />
              </div>

              {/* Duration */}
              <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                <label
                  htmlFor="activity-duration"
                  className="text-xs font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  {t.activityDurationLabel}
                </label>
                <input
                  id="activity-duration"
                  type="number"
                  min="1"
                  max="9999"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="–"
                  className="rounded-lg border px-3 py-1.5 text-sm"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="activity-notes"
                className="text-xs font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                {t.activityNotesLabel}
              </label>
              <textarea
                id="activity-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                maxLength={500}
                className="rounded-lg border px-3 py-2 text-sm resize-none"
                style={inputStyle}
              />
            </div>

            <div className="flex items-center justify-between mt-1">
              <button
                type="submit"
                disabled={submitting || !selectedSlug}
                className="rounded-full px-5 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
                style={{ background: "var(--btn-primary)", color: "var(--btn-primary-text)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--btn-primary-hover)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--btn-primary)";
                }}
              >
                {submitting ? t.activitySubmitting : t.activitySubmit}
              </button>
              {formError && (
                <span className="text-xs" style={{ color: "var(--danger-text)" }}>
                  {formError}
                </span>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Hike history list */}
      {loadingData ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>…</p>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <MountainIcon />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {t.activityNone}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {activities.map((activity) => {
            const trail = trailMap.get(activity.trail_slug);
            const trailName = trail
              ? lang === "sq" && trail.sq?.name
                ? trail.sq.name
                : trail.name
              : activity.trail_slug;
            const difficulty = trail?.difficulty;

            return (
              <li
                key={activity.id}
                className="rounded-xl border p-4 flex items-start justify-between gap-3"
                style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {trail ? (
                      <Link
                        href={`/trails/${activity.trail_slug}`}
                        className="text-sm font-semibold hover:underline truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {trailName}
                      </Link>
                    ) : (
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {trailName}
                      </span>
                    )}
                    {difficulty && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white shrink-0"
                        style={{ background: BADGE_COLOR[difficulty] }}
                      >
                        {BADGE_LABEL[difficulty][lang]}
                      </span>
                    )}
                  </div>
                  <div
                    className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <span>
                      {new Date(activity.completed_at).toLocaleDateString(
                        lang === "sq" ? "sq-AL" : "en-GB",
                      )}
                    </span>
                    {activity.duration_min != null && (
                      <span>{activity.duration_min} min</span>
                    )}
                    {trail && (
                      <>
                        <span>{trail.distanceKm} km</span>
                        <span>{trail.ascentM} m ↑</span>
                      </>
                    )}
                  </div>
                  {activity.notes && (
                    <p
                      className="mt-1.5 text-xs leading-relaxed"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {activity.notes}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(activity.id)}
                  className="shrink-0 rounded-lg border px-2.5 py-1 text-xs transition-colors"
                  style={{
                    borderColor: "var(--card-border)",
                    color: "var(--text-muted)",
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--danger-text)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "var(--danger-border)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--card-border)";
                  }}
                >
                  {t.activityDelete}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

export default function ActivityClient({ trails }: { trails: Trail[] }) {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-2xl px-5 py-16"><p className="text-sm" style={{ color: "var(--text-muted)" }}>…</p></main>}>
      <ActivityInner trails={trails} />
    </Suspense>
  );
}
