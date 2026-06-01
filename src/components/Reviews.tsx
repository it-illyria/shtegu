"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import AuthButton from "@/components/AuthButton";
import { useI18n, interp } from "@/lib/i18n/context";

interface ReviewRow {
  id: string;
  author_name: string;
  rating: number;
  body: string;
  created_at: string;
  verified?: boolean;
}

function Stars({ value }: { value: number }) {
  const { t } = useI18n();
  return (
    <span aria-label={interp(t.reviewsRatingAria, { n: value })}>
      <span style={{ color: "var(--star-active)" }}>{"★".repeat(value)}</span>
      <span style={{ color: "var(--star-empty)" }}>{"★".repeat(5 - value)}</span>
    </span>
  );
}

export default function Reviews({ trailSlug }: { trailSlug: string }) {
  const { lang, t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const signedIn = Boolean(user && !user.is_anonymous);

  // Seed the name field ONLY from a saved username (any device). We never
  // fall back to the email prefix — that would leak PII into a public review.
  // If the user doesn't pick a name, the post is attributed to
  // t.reviewsAnonymous in submit().
  useEffect(() => {
    if (name) return;
    try {
      const saved = localStorage.getItem("shtegu_username");
      if (saved) setName(saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    if (!supabase) return;
    const withVerified = await supabase
      .from("reviews")
      .select("id,author_name,rating,body,created_at,verified")
      .eq("trail_slug", trailSlug)
      .order("created_at", { ascending: false });
    const data = withVerified.error
      ? (await supabase.from("reviews").select("id,author_name,rating,body,created_at").eq("trail_slug", trailSlug).order("created_at", { ascending: false })).data
      : withVerified.data;
    if (data) setReviews(data as unknown as ReviewRow[]);
  }, [trailSlug]);

  useEffect(() => { void load(); }, [load]);

  if (!isSupabaseConfigured || !supabase) {
    return <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>{t.reviewsNoConfig}</p>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || body.trim().length === 0) return;
    const last = Number(localStorage.getItem("shtegu_last_review") ?? 0);
    if (Date.now() - last < 30_000) {
      setMessage(t.reviewsErrorWait);
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
      if (error || !data.user?.id) {
        setMessage(t.reviewsSignInRequired);
        return setStatus("error");
      }
      userId = data.user.id;
    }
    const authorName = name.trim() || t.reviewsAnonymous;
    try { localStorage.setItem("shtegu_username", authorName); } catch {}
    const { error } = await supabase.from("reviews").insert({
      trail_slug: trailSlug, author_id: userId, author_name: authorName, rating, body: body.trim(),
    });
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === "23505") setMessage(t.reviewsErrorDuplicate);
      else if (/rate_limited/.test(error.message)) setMessage(t.reviewsErrorTooMany);
      else setMessage(t.reviewsErrorFail);
      return setStatus("error");
    }
    try { localStorage.setItem("shtegu_last_review", String(Date.now())); } catch {}
    setBody(""); setMessage(null); setStatus("idle");
    await load();
  }

  const inputStyle = { borderColor: "var(--input-border)", background: "var(--input-bg)", color: "var(--input-text)" };

  return (
    <div className="mt-3">
      <form
        onSubmit={submit}
        className="rounded-xl border p-4"
        style={{ borderColor: "var(--card-border)" }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.reviewsNamePlaceholder}
            maxLength={60}
            className="flex-1 rounded-lg border px-3 py-1.5 text-sm"
            style={inputStyle}
          />
          <label className="flex items-center gap-1 text-sm" style={{ color: "var(--text-primary)" }}>
            {t.reviewsRatingLabel}
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="rounded-lg border px-2 py-1.5"
              style={inputStyle}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n} aria-label={interp(t.reviewsRatingAria, { n })}>
                  {interp(t.reviewsRatingOption, { n })}
                </option>
              ))}
            </select>
          </label>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t.reviewsTextPlaceholder}
          rows={3}
          maxLength={4000}
          className="mt-3 w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        />
        <div className="mt-2 flex items-center justify-between">
          <button
            type="submit"
            disabled={status === "saving" || body.trim().length === 0 || authLoading}
            className="rounded-lg px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
            style={{ background: "var(--btn-primary)", color: "var(--btn-primary-text)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--btn-primary-hover)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--btn-primary)"; }}
          >
            {status === "saving" ? t.reviewsPosting : t.reviewsPost}
          </button>
          {status === "error" && (
            <span className="text-xs" style={{ color: "var(--danger-text)" }}>
              {message ?? t.reviewsErrorFail}
            </span>
          )}
        </div>
        {status === "error" && !signedIn && (message === t.reviewsSignInRequired || message === t.reviewsErrorSession) && (
          <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--card-border)" }}>
            <p className="mb-2 text-xs" style={{ color: "var(--text-muted)" }}>
              {t.reviewsSignInRequired}
            </p>
            <AuthButton />
          </div>
        )}
      </form>

      <ul className="mt-4 flex flex-col gap-3">
        {reviews.length === 0 && (
          <li className="text-sm" style={{ color: "var(--text-muted)" }}>{t.reviewsNone}</li>
        )}
        {reviews.map((r) => (
          <li
            key={r.id}
            className="rounded-xl border p-3"
            style={{ borderColor: "var(--card-border)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {r.author_name}
                {r.verified === false && (
                  <span
                    className="ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-normal"
                    style={{ background: "var(--badge-guest-bg)", color: "var(--badge-guest-text)" }}
                  >
                    {t.reviewsGuestBadge}
                  </span>
                )}
              </span>
              <Stars value={r.rating} />
            </div>
            <p className="mt-1 text-sm" style={{ color: "var(--text-primary)" }}>{r.body}</p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              {new Date(r.created_at).toLocaleDateString(lang === "sq" ? "sq-AL" : "en-GB")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
