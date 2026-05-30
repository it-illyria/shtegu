"use client";

import { useState, type SubmitEvent } from "react";
import { useT } from "@/lib/i18n/context";

type Kind = "complaint" | "suggestion" | "other";

const FORMSPREE_ID = process.env.NEXT_PUBLIC_FORMSPREE_ID;

export default function FeedbackForm() {
  const t = useT();
  const [kind, setKind] = useState<Kind>("suggestion");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!FORMSPREE_ID) {
    return (
      <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
        {t.feedbackNoConfig}
      </p>
    );
  }

  if (status === "done") {
    return (
      <div
        className="mt-2 rounded-xl border p-4 text-sm"
        style={{ background: "var(--success-bg)", borderColor: "var(--success-border)", color: "var(--success-text)" }}
      >
        {t.feedbackSuccess}
      </div>
    );
  }

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (message.trim().length === 0) return;
    const last = Number(localStorage.getItem("shtegu_last_feedback") ?? 0);
    if (Date.now() - last < 15_000) {
      setError(t.feedbackErrorWait);
      setStatus("error");
      return;
    }
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ kind, message: message.trim(), email: email.trim() || undefined }),
      });
      if (!res.ok) throw new Error(await res.text());
      localStorage.setItem("shtegu_last_feedback", String(Date.now()));
      setStatus("done");
    } catch {
      setError(t.feedbackErrorFail);
      setStatus("error");
    }
  }

  const inputStyle = { borderColor: "var(--input-border)", background: "var(--input-bg)", color: "var(--input-text)" };

  return (
    <form
      onSubmit={submit}
      className="mt-2 rounded-xl border p-4"
      style={{ borderColor: "var(--card-border)" }}
    >
      <label className="block text-sm" style={{ color: "var(--text-primary)" }}>
        {t.feedbackTypeLabel}
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as Kind)}
          className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        >
          <option value="suggestion">{t.feedbackSuggestion}</option>
          <option value="complaint">{t.feedbackComplaint}</option>
          <option value="other">{t.feedbackOther}</option>
        </select>
      </label>

      <label className="mt-3 block text-sm" style={{ color: "var(--text-primary)" }}>
        {t.feedbackMessageLabel}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={5}
          maxLength={4000}
          placeholder={t.feedbackMessagePlaceholder}
          className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        />
      </label>

      <label className="mt-3 block text-sm" style={{ color: "var(--text-primary)" }}>
        {t.feedbackEmailLabel}{" "}
        <span style={{ color: "var(--text-muted)" }}>{t.feedbackEmailHint}</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={200}
          placeholder={t.feedbackEmailPlaceholder}
          className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        />
      </label>

      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="submit"
          disabled={status === "saving" || message.trim().length === 0}
          className="rounded-lg px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
          style={{ background: "var(--btn-primary)", color: "var(--btn-primary-text)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--btn-primary-hover)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--btn-primary)"; }}
        >
          {status === "saving" ? t.feedbackSending : t.feedbackSendButton}
        </button>
        {status === "error" && error && (
          <span className="text-xs" style={{ color: "var(--danger-text)" }}>{error}</span>
        )}
      </div>
    </form>
  );
}
