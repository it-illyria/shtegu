"use client";

import { useI18n } from "@/lib/i18n/context";

export default function LanguageToggle() {
  const { lang, t, setLang } = useI18n();

  return (
    <div
      className="flex items-center gap-0.5 rounded-full border text-xs font-medium"
      style={{ borderColor: "var(--card-border)" }}
    >
      {(["sq", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-label={l === "sq" ? t.langAlbanian : t.langEnglish}
          aria-pressed={lang === l}
          className="inline-flex h-7 min-w-[34px] items-center justify-center rounded-full px-2.5 transition-colors"
          style={
            lang === l
              ? { background: "var(--text-primary)", color: "var(--background)" }
              : { color: "var(--text-nav)" }
          }
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
