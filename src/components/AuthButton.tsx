"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useT } from "@/lib/i18n/context";

export default function AuthButton() {
  const t = useT();
  const { user, loading, signInWithEmail, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const signedIn = Boolean(user && !user.is_anonymous);

  if (loading) {
    return <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t.authLoading}</span>;
  }

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

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim().length === 0) return;
    setStatus("sending");
    setError(null);
    const { error: err } = await signInWithEmail(email.trim());
    if (err) { setError(err); setStatus("error"); return; }
    setStatus("sent");
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
