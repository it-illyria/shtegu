"use client";

import { useEffect, useState } from "react";
import type { TrailProposal, TrailContribution, Difficulty } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import en from "@/lib/i18n/en";

type AlertSeverity = "info" | "warning" | "danger";

interface AdminAlert {
  id: string;
  message_en: string;
  message_sq: string;
  severity: AlertSeverity;
  dismissable: boolean;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
}

const BADGE_COLOR: Record<Difficulty, string> = {
  easy: "#6BA368",
  moderate: "#D9A441",
  hard: "#C96B4B",
  expert: "#8A3E3E",
};

const BADGE_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  moderate: "Moderate",
  hard: "Hard",
  expert: "Expert",
};

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
      style={{ background: BADGE_COLOR[difficulty] }}
    >
      {BADGE_LABEL[difficulty]}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface Toast {
  id: number;
  message: string;
  ok: boolean;
}

let toastCounter = 0;

interface Props {
  initialProposals: TrailProposal[];
  initialContributions: TrailContribution[];
}

export default function AdminClient({ initialProposals, initialContributions }: Props) {
  const [tab, setTab] = useState<"proposals" | "contributions" | "alerts">("proposals");
  const [proposals, setProposals] = useState<TrailProposal[]>(initialProposals);
  const [contributions, setContributions] = useState<TrailContribution[]>(initialContributions);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [busy, setBusy] = useState<Set<string>>(new Set());

  function addToast(message: string, ok: boolean) {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, message, ok }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }

  async function handleProposalAction(id: string, action: "approved" | "rejected") {
    if (!supabase) {
      addToast("Supabase is not configured.", false);
      return;
    }
    setBusy((prev) => new Set(prev).add(id));
    const { error } = await supabase
      .from("trail_proposals")
      .update({ status: action })
      .eq("id", id);
    setBusy((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (error) {
      console.error("[Admin] proposal action failed", error);
      addToast(en.adminErrorGeneric, false);
    } else {
      setProposals((prev) => prev.filter((p) => p.id !== id));
      addToast(
        action === "approved" ? "Proposal approved." : "Proposal rejected.",
        true,
      );
    }
  }

  async function handleContributionAction(id: string, action: "approved" | "rejected") {
    if (!supabase) {
      addToast("Supabase is not configured.", false);
      return;
    }
    setBusy((prev) => new Set(prev).add(id));
    const { error } = await supabase
      .from("trail_contributions")
      .update({ status: action })
      .eq("id", id);
    setBusy((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (error) {
      console.error("[Admin] contribution action failed", error);
      addToast(en.adminErrorGeneric, false);
    } else {
      setContributions((prev) => prev.filter((c) => c.id !== id));
      addToast(
        action === "approved" ? "Contribution approved." : "Contribution rejected.",
        true,
      );
    }
  }

  const tabStyle = (active: boolean) => ({
    color: active ? "var(--text-primary)" : "var(--text-muted)",
    borderBottom: active ? "2px solid var(--summit-green)" : "2px solid transparent",
    paddingBottom: "10px",
    fontWeight: active ? 600 : 400,
    background: "transparent",
    cursor: "pointer",
    fontSize: "14px",
    transition: "color 0.15s",
  });

  return (
    <main className="flex flex-1 flex-col px-4 py-6 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="font-display text-[22px] font-bold tracking-tight sm:text-[26px]"
          style={{ color: "var(--text-primary)" }}
        >
          Admin Panel
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Review and moderate community trail submissions.
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-4 border-b mb-6 sm:gap-6 overflow-x-auto"
        style={{ borderColor: "var(--card-border)" }}
      >
        <button
          style={tabStyle(tab === "proposals")}
          onClick={() => setTab("proposals")}
          className="shrink-0 whitespace-nowrap"
        >
          Proposals ({proposals.length})
        </button>
        <button
          style={tabStyle(tab === "contributions")}
          onClick={() => setTab("contributions")}
          className="shrink-0 whitespace-nowrap"
        >
          Contributions ({contributions.length})
        </button>
        <button
          style={tabStyle(tab === "alerts")}
          onClick={() => setTab("alerts")}
          className="shrink-0 whitespace-nowrap"
        >
          Alerts
        </button>
      </div>

      {/* Proposals tab */}
      {tab === "proposals" && (
        <div className="flex flex-col gap-4">
          {proposals.length === 0 ? (
            <EmptyState message="No pending trail proposals." />
          ) : (
            proposals.map((p) => (
              <ProposalCard
                key={p.id}
                proposal={p}
                isBusy={busy.has(p.id)}
                onApprove={() => handleProposalAction(p.id, "approved")}
                onReject={() => handleProposalAction(p.id, "rejected")}
              />
            ))
          )}
        </div>
      )}

      {/* Contributions tab */}
      {tab === "contributions" && (
        <div className="flex flex-col gap-4">
          {contributions.length === 0 ? (
            <EmptyState message="No pending trail contributions." />
          ) : (
            contributions.map((c) => (
              <ContributionCard
                key={c.id}
                contribution={c}
                isBusy={busy.has(c.id)}
                onApprove={() => handleContributionAction(c.id, "approved")}
                onReject={() => handleContributionAction(c.id, "rejected")}
              />
            ))
          )}
        </div>
      )}

      {/* Alerts tab */}
      {tab === "alerts" && <AlertsTab onToast={addToast} />}

      {/* Toasts — above mobile bottom nav */}
      <div className="fixed left-4 right-4 bottom-20 z-50 flex flex-col gap-2 sm:left-auto sm:bottom-6 sm:right-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="rounded-xl px-4 py-3 text-sm font-medium shadow-lg"
            style={{
              background: t.ok ? "var(--success-bg)" : "var(--danger-bg)",
              color: t.ok ? "var(--success-text)" : "var(--danger-text)",
              border: `1px solid ${t.ok ? "var(--success-border)" : "var(--danger-border)"}`,
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </main>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      className="rounded-2xl p-10 text-center"
      style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
    >
      <p style={{ color: "var(--text-muted)" }}>{message}</p>
    </div>
  );
}

function ActionButtons({
  isBusy,
  onApprove,
  onReject,
}: {
  isBusy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 mt-4 sm:flex sm:gap-2">
      <button
        onClick={onApprove}
        disabled={isBusy}
        className="inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white transition-opacity disabled:opacity-50 sm:h-9 sm:py-1.5"
        style={{ background: "#3F6B46" }}
      >
        Approve
      </button>
      <button
        onClick={onReject}
        disabled={isBusy}
        className="inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-opacity disabled:opacity-50 sm:h-9 sm:py-1.5"
        style={{
          background: "var(--danger-bg)",
          color: "var(--danger-text)",
          border: "1px solid var(--danger-border)",
        }}
      >
        Reject
      </button>
    </div>
  );
}

function ProposalCard({
  proposal: p,
  isBusy,
  onApprove,
  onReject,
}: {
  proposal: TrailProposal;
  isBusy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
    >
      {/* Top row */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <h2
            className="font-display text-[17px] font-bold leading-snug"
            style={{ color: "var(--text-primary)" }}
          >
            {p.name}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {p.region} &middot; by {p.contributorName} &middot; {formatDate(p.createdAt)}
          </p>
        </div>
        <DifficultyBadge difficulty={p.difficulty} />
      </div>

      {/* Stats row */}
      {(p.distanceKm != null || p.ascentM != null || p.durationH != null) && (
        <div
          className="flex flex-wrap gap-4 text-xs mb-3"
          style={{ color: "var(--text-muted)" }}
        >
          {p.distanceKm != null && <span>{p.distanceKm} km</span>}
          {p.ascentM != null && <span>{p.ascentM} m ascent</span>}
          {p.durationH != null && <span>{p.durationH}h</span>}
        </div>
      )}

      {/* Summary */}
      {p.summary && (
        <p className="text-sm mb-3 leading-relaxed" style={{ color: "var(--text-primary)" }}>
          {p.summary}
        </p>
      )}

      {/* Notes from contributor */}
      {p.notes && (
        <p className="text-xs italic mb-3" style={{ color: "var(--text-muted)" }}>
          Note: {p.notes}
        </p>
      )}

      {/* Route indicator */}
      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
        Has route:{" "}
        <span
          className="font-semibold"
          style={{ color: p.routeGeojson ? "var(--success-text)" : "var(--danger-text)" }}
        >
          {p.routeGeojson ? "Yes" : "No"}
        </span>
      </p>

      <ActionButtons isBusy={isBusy} onApprove={onApprove} onReject={onReject} />
    </div>
  );
}

const CONTRIBUTION_FIELD_LABELS: Array<[keyof TrailContribution, string]> = [
  ["name", "Name"],
  ["nameSq", "Name (Albanian)"],
  ["region", "Region"],
  ["difficulty", "Difficulty"],
  ["summary", "Summary"],
  ["distanceKm", "Distance (km)"],
  ["ascentM", "Ascent (m)"],
  ["durationH", "Duration (h)"],
  ["bestMonths", "Best months"],
  ["logistics", "Logistics"],
  ["routeGeojson", "Route"],
];

function ContributionCard({
  contribution: c,
  isBusy,
  onApprove,
  onReject,
}: {
  contribution: TrailContribution;
  isBusy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const changedFields = CONTRIBUTION_FIELD_LABELS.filter(([key]) => {
    const val = c[key];
    return val != null && val !== "";
  });

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
    >
      {/* Header */}
      <div className="mb-3">
        <h2
          className="font-display text-[15px] font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Edit to:{" "}
          <span style={{ color: "var(--summit-green)" }}>{c.trailSlug}</span>
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          by {c.contributorName} &middot; {formatDate(c.createdAt)}
        </p>
      </div>

      {/* Contributor message */}
      {c.message && (
        <p className="text-sm mb-3 italic" style={{ color: "var(--text-muted)" }}>
          &ldquo;{c.message}&rdquo;
        </p>
      )}

      {/* Changed fields */}
      {changedFields.length > 0 && (
        <div
          className="rounded-xl p-3 mb-3 flex flex-col gap-1.5"
          style={{ background: "var(--surface-inset)" }}
        >
          {changedFields.map(([key, label]) => {
            const val = c[key];
            let display: string;
            if (key === "routeGeojson") {
              display = "[GeoJSON LineString]";
            } else if (Array.isArray(val)) {
              display = (val as string[]).join(", ");
            } else {
              display = String(val);
            }
            return (
              <div key={key} className="text-xs flex gap-2">
                <span
                  className="font-semibold shrink-0"
                  style={{ color: "var(--text-muted)" }}
                >
                  {label}:
                </span>
                <span style={{ color: "var(--text-primary)" }}>{display}</span>
              </div>
            );
          })}
        </div>
      )}

      {changedFields.length === 0 && (
        <p className="text-xs mb-3 italic" style={{ color: "var(--text-muted)" }}>
          No field changes — message only.
        </p>
      )}

      <ActionButtons isBusy={isBusy} onApprove={onApprove} onReject={onReject} />
    </div>
  );
}

// ─── Alerts management ──────────────────────────────────────────────────────

function AlertsTab({ onToast }: { onToast: (msg: string, ok: boolean) => void }) {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageEn, setMessageEn] = useState("");
  const [messageSq, setMessageSq] = useState("");
  const [severity, setSeverity] = useState<AlertSeverity>("info");
  const [dismissable, setDismissable] = useState(true);
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("system_alerts")
      .select("id,message_en,message_sq,severity,dismissable,starts_at,ends_at,created_at")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      console.error("[Admin] alerts load failed", error);
      onToast(en.adminErrorGeneric, false);
      return;
    }
    if (data) setAlerts(data as AdminAlert[]);
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function createAlert(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || messageEn.trim().length === 0 || messageSq.trim().length === 0) return;
    setSaving(true);
    const { error } = await supabase.from("system_alerts").insert({
      message_en: messageEn.trim(),
      message_sq: messageSq.trim(),
      severity,
      dismissable,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    });
    setSaving(false);
    if (error) {
      console.error("[Admin] alert create failed", error);
      onToast(en.adminErrorGeneric, false);
      return;
    }
    setMessageEn(""); setMessageSq(""); setEndsAt(""); setSeverity("info"); setDismissable(true);
    onToast("Alert created.", true);
    void load();
  }

  async function deleteAlert(id: string) {
    if (!supabase) return;
    const { error } = await supabase.from("system_alerts").delete().eq("id", id);
    if (error) {
      console.error("[Admin] alert delete failed", error);
      onToast(en.adminErrorGeneric, false);
      return;
    }
    onToast("Alert deleted.", true);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  const inputStyle = {
    background: "var(--input-bg)",
    color: "var(--input-text)",
    borderColor: "var(--input-border)",
  };

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={createAlert}
        className="rounded-2xl p-5 flex flex-col gap-3"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
      >
        <h2 className="font-display text-[17px] font-semibold" style={{ color: "var(--text-primary)" }}>New alert</h2>
        <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
          Message (English)
          <input
            type="text"
            value={messageEn}
            onChange={(e) => setMessageEn(e.target.value)}
            required
            maxLength={300}
            className="h-10 rounded-lg border px-3 text-sm"
            style={inputStyle}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
          Message (Albanian)
          <input
            type="text"
            value={messageSq}
            onChange={(e) => setMessageSq(e.target.value)}
            required
            maxLength={300}
            className="h-10 rounded-lg border px-3 text-sm"
            style={inputStyle}
          />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Severity
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as AlertSeverity)}
              className="h-10 rounded-lg border px-3 text-sm"
              style={inputStyle}
            >
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="danger">Danger</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Ends at (optional)
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="h-10 rounded-lg border px-3 text-sm"
              style={inputStyle}
            />
          </label>
          <label className="flex items-center gap-2 text-sm mt-4 sm:mt-6" style={{ color: "var(--text-primary)" }}>
            <input
              type="checkbox"
              checked={dismissable}
              onChange={(e) => setDismissable(e.target.checked)}
            />
            Dismissable
          </label>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold text-white transition-opacity disabled:opacity-50 sm:h-9 sm:self-start"
          style={{ background: "#3F6B46" }}
        >
          {saving ? "Saving…" : "Create alert"}
        </button>
      </form>

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-[17px] font-semibold" style={{ color: "var(--text-primary)" }}>
          Alerts {loading ? "" : `(${alerts.length})`}
        </h2>
        {loading ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
        ) : alerts.length === 0 ? (
          <EmptyState message="No alerts." />
        ) : (
          alerts.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl p-4 flex flex-col gap-2"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span
                  className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                  style={{
                    background:
                      a.severity === "danger" ? "#FBE6E2" :
                      a.severity === "warning" ? "#FFF6E0" : "#E8F1EC",
                    color:
                      a.severity === "danger" ? "#5A1818" :
                      a.severity === "warning" ? "#5E3E05" : "#1B3626",
                  }}
                >
                  {a.severity}
                </span>
                <button
                  type="button"
                  onClick={() => void deleteAlert(a.id)}
                  className="inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs"
                  style={{
                    borderColor: "var(--danger-border)",
                    color: "var(--danger-text)",
                    background: "transparent",
                  }}
                >
                  Delete
                </button>
              </div>
              <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                <strong>EN:</strong> {a.message_en}
              </p>
              <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                <strong>SQ:</strong> {a.message_sq}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {formatDate(a.starts_at)}
                {a.ends_at ? ` → ${formatDate(a.ends_at)}` : " · no end"}
                {a.dismissable ? " · dismissable" : " · forced"}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
