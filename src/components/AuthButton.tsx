"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useT } from "@/lib/i18n/context";

function PersonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="7" r="3.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 17c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

interface Props {
  /** When true, render only a compact icon button with a dropdown (mobile header). */
  compact?: boolean;
}

export default function AuthButton({ compact = false }: Props) {
  const t = useT();
  const { user, loading, signInWithEmail, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const signedIn = Boolean(user && !user.is_anonymous);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (loading) {
    return <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t.authLoading}</span>;
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim().length === 0) return;
    setStatus("sending");
    setError(null);
    const { error: err } = await signInWithEmail(email.trim());
    if (err) { setError(err); setStatus("error"); return; }
    setStatus("sent");
  }

  // ── Compact (mobile header) ───────────────────────────────────────────────
  if (compact) {
    return (
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={signedIn ? (user?.email ?? "Account") : t.authSendMagicLink}
          aria-expanded={open}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
          style={{
            borderColor: "var(--card-border)",
            background: signedIn ? "var(--summit-green, #2F4F3A)" : "transparent",
            color: signedIn ? "#fff" : "var(--text-nav)",
          }}
        >
          {signedIn && user?.email ? (
            <span className="text-xs font-bold">{user.email[0].toUpperCase()}</span>
          ) : (
            <PersonIcon />
          )}
        </button>

        {open && (
          <div
            className="absolute right-0 top-11 z-50 w-64 rounded-xl border p-3 shadow-lg"
            style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
          >
            {signedIn ? (
              <div className="flex flex-col gap-2">
                <p className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
                  {user?.email}
                </p>
                <button
                  type="button"
                  onClick={() => { setOpen(false); void signOut(); }}
                  className="inline-flex h-10 items-center justify-center rounded-full border text-sm font-medium transition-colors"
                  style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                >
                  {t.authSignOut}
                </button>
              </div>
            ) : status === "sent" ? (
              <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                {t.authCheckInbox}
              </p>
            ) : (
              <form onSubmit={send} className="flex flex-col gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.authEmailPlaceholder}
                  required
                  autoFocus
                  className="h-10 w-full rounded-lg border px-3 text-sm"
                  style={{ borderColor: "var(--input-border)", background: "var(--input-bg)", color: "var(--input-text)" }}
                />
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="inline-flex h-10 items-center justify-center rounded-full text-sm font-semibold transition-colors disabled:opacity-50"
                  style={{ background: "var(--btn-primary)", color: "var(--btn-primary-text)" }}
                >
                  {status === "sending" ? t.authSending : t.authSendMagicLink}
                </button>
                {status === "error" && (
                  <span className="text-xs" style={{ color: "var(--danger-text)" }}>{error ?? t.authError}</span>
                )}
              </form>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Full inline (desktop / Reviews fallback) ──────────────────────────────
  if (signedIn) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span style={{ color: "var(--text-nav)" }}>{user?.email}</span>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
          style={{
            borderColor: "var(--card-border)",
            color: "var(--text-primary)",
            background: "transparent",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--hover-overlay)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          {t.authSignOut}
        </button>
      </div>
    );
  }

  if (status === "sent") {
    return (
      <span className="text-xs" style={{ color: "var(--text-nav)" }}>
        {t.authCheckInbox}
      </span>
    );
  }

  return (
    <form onSubmit={send} className="flex items-center gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t.authEmailPlaceholder}
        required
        className="rounded-lg border px-2 py-1 text-sm"
        style={{ borderColor: "var(--input-border)", background: "var(--input-bg)", color: "var(--input-text)" }}
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-full px-3 py-1 text-xs font-medium disabled:opacity-50 transition-colors"
        style={{ background: "var(--btn-primary)", color: "var(--btn-primary-text)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--btn-primary-hover)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--btn-primary)"; }}
      >
        {status === "sending" ? t.authSending : t.authSendMagicLink}
      </button>
      {status === "error" && (
        <span className="text-xs" style={{ color: "var(--danger-text)" }}>{error ?? t.authError}</span>
      )}
    </form>
  );
}
