"use client";

import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n/context";

type Severity = "info" | "warning" | "danger";

interface SystemAlert {
  id: string;
  message_en: string;
  message_sq: string;
  severity: Severity;
  dismissable: boolean;
}

const LS_KEY = "shtegu_dismissed_alerts";

function readDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return new Set(parsed as string[]);
  } catch {
    // ignore parse errors
  }
  return new Set();
}

function writeDismissed(ids: Set<string>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore storage errors
  }
}

const SEVERITY_STYLE: Record<Severity, { bg: string; fg: string; border: string }> = {
  info:    { bg: "#E8F1EC", fg: "#1B3626", border: "#B7D4C3" },
  warning: { bg: "#FFF6E0", fg: "#5E3E05", border: "#E8D08A" },
  danger:  { bg: "#FBE6E2", fg: "#5A1818", border: "#E8B0A6" },
};

export default function AlertBanner() {
  const { lang } = useI18n();
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Static env-driven alert (config from build time)
  useEffect(() => {
    const envMessageEn = process.env.NEXT_PUBLIC_ALERT_MESSAGE;
    const envMessageSq = process.env.NEXT_PUBLIC_ALERT_MESSAGE_SQ;
    const envSeverity = (process.env.NEXT_PUBLIC_ALERT_SEVERITY as Severity) || "info";
    setDismissed(readDismissed());

    if (envMessageEn) {
      setAlerts((prev) => {
        if (prev.some((a) => a.id === "env")) return prev;
        return [
          {
            id: "env",
            message_en: envMessageEn,
            message_sq: envMessageSq || envMessageEn,
            severity: envSeverity,
            dismissable: true,
          },
          ...prev,
        ];
      });
    }
  }, []);

  // Live alerts from Supabase
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const ctrl = new AbortController();

    async function load() {
      const { data, error } = await supabase!
        .from("system_alerts")
        .select("id,message_en,message_sq,severity,dismissable,starts_at,ends_at")
        .order("created_at", { ascending: false });

      if (ctrl.signal.aborted || error || !data) return;
      const now = Date.now();
      const active: SystemAlert[] = data
        .filter((r: { starts_at: string; ends_at: string | null }) => {
          const startOk = new Date(r.starts_at).getTime() <= now;
          const endOk = !r.ends_at || new Date(r.ends_at).getTime() > now;
          return startOk && endOk;
        })
        .map((r) => ({
          id: r.id,
          message_en: r.message_en,
          message_sq: r.message_sq,
          severity: r.severity as Severity,
          dismissable: r.dismissable,
        }));
      setAlerts((prev) => {
        const env = prev.find((a) => a.id === "env");
        return env ? [env, ...active] : active;
      });
    }

    void load();
    return () => ctrl.abort();
  }, []);

  // RT4-M9: cross-tab sync. If the user dismisses an alert in another tab,
  // mirror that here so the banner doesn't reappear on this tab.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== LS_KEY) return;
      setDismissed(readDismissed());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function dismiss(id: string) {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    writeDismissed(next);
  }

  // Highest severity active, undismissed alert wins.
  const SEVERITY_RANK: Record<Severity, number> = { danger: 3, warning: 2, info: 1 };
  const visible = alerts
    .filter((a) => !dismissed.has(a.id))
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);

  if (visible.length === 0) return null;
  const top = visible[0];
  const style = SEVERITY_STYLE[top.severity];
  const message = lang === "sq" ? top.message_sq : top.message_en;

  return (
    <div
      role="alert"
      className="flex items-start gap-3 border-b px-4 py-2.5 text-sm sm:px-6"
      style={{ background: style.bg, color: style.fg, borderColor: style.border }}
    >
      <span className="mt-0.5" aria-hidden>
        {top.severity === "danger" ? "⚠" : top.severity === "warning" ? "⚠" : "ⓘ"}
      </span>
      <p className="flex-1 leading-snug">{message}</p>
      {top.dismissable && (
        <button
          type="button"
          onClick={() => dismiss(top.id)}
          aria-label="Dismiss"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base leading-none transition-opacity hover:opacity-70"
          style={{ color: style.fg }}
        >
          ×
        </button>
      )}
    </div>
  );
}
