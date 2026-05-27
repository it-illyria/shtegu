"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { useI18n, interp } from "@/lib/i18n/context";

type ConditionType = "good" | "muddy" | "overgrown" | "closed";

interface ConditionRow {
  id: string;
  reporter_name: string;
  condition: ConditionType;
  notes: string | null;
  reported_at: string;
}

const CONDITION_COLORS: Record<ConditionType, string> = {
  good:      "#6BA368",
  muddy:     "#D9A441",
  overgrown: "#B5A020",
  closed:    "#C96B4B",
};

const CONDITION_ICONS: Record<ConditionType, string> = {
  good:      "✓",
  muddy:     "🟤",
  overgrown: "🌿",
  closed:    "⛔",
};

function conditionLabel(c: ConditionType, t: ReturnType<typeof useI18n>["t"]): string {
  return { good: t.conditionGood, muddy: t.conditionMuddy, overgrown: t.conditionOvergrown, closed: t.conditionClosed }[c];
}

function daysAgo(dateStr: string): number {
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.floor(ms / 86_400_000);
}

function AgoLabel({ dateStr, t }: { dateStr: string; t: ReturnType<typeof useI18n>["t"] }) {
  const days = daysAgo(dateStr);
  return <span>{days === 0 ? t.conditionToday : interp(t.conditionReportedAgo, { days })}</span>;
}

export default function ConditionReport({ trailSlug }: { trailSlug: string }) {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();

  const [conditions, setConditions] = useState<ConditionRow[]>([]);
  const [selected, setSelected] = useState<ConditionType | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("trail_conditions")
      .select("id,reporter_name,condition,notes,reported_at")
      .eq("trail_slug", trailSlug)
      .gte("reported_at", thirtyDaysAgo)
      .order("reported_at", { ascending: false })
      .limit(10);
    if (data) setConditions(data as ConditionRow[]);
  }, [trailSlug, thirtyDaysAgo]);

  useEffect(() => { void load(); }, [load]);

  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const latest = conditions[0] ?? null;
  const recentList = conditions.slice(1, 3);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !selected) return;

    const rateKey = `shtegu_condition_${trailSlug}`;
    const last = Number(localStorage.getItem(rateKey) ?? 0);
    if (Date.now() - last < 86_400_000) {
      setMessage(t.conditionErrorWait);
      return setStatus("error");
    }

    setStatus("saving");
    setMessage(null);

    let userId = user?.id;
    if (!userId) {
      const { data: sessionData } = await supabase.auth.getSession();
      userId = sessionData.session?.user?.id;
    }
    if (!userId) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) { setMessage(t.conditionErrorFail); return setStatus("error"); }
      userId = data.user?.id;
    }

    const { error } = await supabase.from("trail_conditions").insert({
      trail_slug: trailSlug,
      reporter_id: userId,
      reporter_name: "Anonymous",
      condition: selected,
      notes: notes.trim() || null,
    });

    if (error) {
      setMessage(t.conditionErrorFail);
      return setStatus("error");
    }

    localStorage.setItem(rateKey, String(Date.now()));
    setSelected(null);
    setNotes("");
    setMessage(null);
    setStatus("idle");
    await load();
  }

  const inputStyle = {
    borderColor: "var(--input-border)",
    background: "var(--input-bg)",
    color: "var(--input-text)",
  };

  const conditionButtons: ConditionType[] = ["good", "muddy", "overgrown", "closed"];

  return (
    <div className="mt-3">
      {/* Latest condition badge */}
      {latest ? (
        <div className="mb-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
            style={{ background: CONDITION_COLORS[latest.condition as ConditionType] + "22", color: CONDITION_COLORS[latest.condition as ConditionType] }}
          >
            <span>{CONDITION_ICONS[latest.condition as ConditionType]}</span>
            <span>{conditionLabel(latest.condition as ConditionType, t)}</span>
            <span className="text-xs opacity-70">— <AgoLabel dateStr={latest.reported_at} t={t} /></span>
          </span>

          {recentList.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {recentList.map((r) => (
                <li key={r.id} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span
                    className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                    style={{ background: CONDITION_COLORS[r.condition as ConditionType] }}
                  />
                  <span style={{ color: CONDITION_COLORS[r.condition as ConditionType] }}>
                    {conditionLabel(r.condition as ConditionType, t)}
                  </span>
                  <span>·</span>
                  <AgoLabel dateStr={r.reported_at} t={t} />
                  {r.notes && (
                    <>
                      <span>·</span>
                      <span className="truncate max-w-[200px]">{r.notes}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="mb-3 text-sm" style={{ color: "var(--text-muted)" }}>{t.conditionNone}</p>
      )}

      {/* Report form */}
      <form
        onSubmit={submit}
        className="rounded-xl border p-4"
        style={{ borderColor: "var(--card-border)" }}
      >
        {/* Condition selector buttons */}
        <div className="flex flex-wrap gap-2">
          {conditionButtons.map((c) => {
            const active = selected === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setSelected(c)}
                className="rounded-full px-3 py-1.5 text-sm font-medium transition-colors border"
                style={{
                  background: active ? CONDITION_COLORS[c] + "22" : "var(--surface-inset)",
                  borderColor: active ? CONDITION_COLORS[c] : "var(--card-border)",
                  color: active ? CONDITION_COLORS[c] : "var(--text-muted)",
                }}
              >
                {CONDITION_ICONS[c]} {conditionLabel(c, t)}
              </button>
            );
          })}
        </div>

        {/* Notes textarea */}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t.conditionNotes}
          rows={2}
          maxLength={200}
          className="mt-3 w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        />

        {/* Submit row */}
        <div className="mt-2 flex items-center justify-between">
          <button
            type="submit"
            disabled={status === "saving" || !selected || authLoading}
            className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
            style={{ background: "var(--btn-primary)", color: "var(--btn-primary-text)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--btn-primary-hover)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--btn-primary)"; }}
          >
            {status === "saving" ? t.conditionSubmitting : t.conditionSubmit}
          </button>
          {status === "error" && (
            <span className="text-xs" style={{ color: "var(--danger-text)" }}>
              {message ?? t.conditionErrorFail}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
