"use client";

import { useTheme } from "@/lib/theme/context";
import { useT } from "@/lib/i18n/context";

const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="4" />
    <line x1="12" y1="2"  x2="12" y2="4"  />
    <line x1="12" y1="20" x2="12" y2="22" />
    <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64"  />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="2"  y1="12" x2="4"  y2="12" />
    <line x1="20" y1="12" x2="22" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"  />
  </svg>
);

const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export default function ThemeToggle() {
  const { resolved, setTheme } = useTheme();
  const t = useT();
  const isDark = resolved === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? t.themeSwitchLight : t.themeSwitchDark}
      className="flex h-7 w-7 items-center justify-center rounded-full border transition-colors"
      style={{ borderColor: "var(--card-border)", color: "var(--text-nav)" }}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
