"use client";

import { useState } from "react";
import type { TrailProposal, TrailContribution, Difficulty } from "@/lib/types";
import { supabase } from "@/lib/supabase";

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
  const [tab, setTab] = useState<"proposals" | "contributions">("proposals");
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
      addToast(`Error: ${error.message}`, false);
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
      addToast(`Error: ${error.message}`, false);
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
    <main className="flex flex-1 flex-col p-6 lg:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="font-display text-[26px] font-bold tracking-tight"
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
        className="flex gap-6 border-b mb-6"
        style={{ borderColor: "var(--card-border)" }}
      >
        <button style={tabStyle(tab === "proposals")} onClick={() => setTab("proposals")}>
          Proposals ({proposals.length})
        </button>
        <button
          style={tabStyle(tab === "contributions")}
          onClick={() => setTab("contributions")}
        >
          Contributions ({contributions.length})
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

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
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
    <div className="flex gap-2 mt-4">
      <button
        onClick={onApprove}
        disabled={isBusy}
        className="rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
        style={{ background: "#3F6B46" }}
      >
        Approve
      </button>
      <button
        onClick={onReject}
        disabled={isBusy}
        className="rounded-lg px-4 py-1.5 text-sm font-semibold transition-opacity disabled:opacity-50"
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
