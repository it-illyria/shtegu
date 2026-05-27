"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Dictionary } from "./types";
import en from "./en";
import sq from "./sq";

export type Lang = "sq" | "en";

const COOKIE_NAME = "shtegu_lang";
const DICTIONARIES: Record<Lang, Dictionary> = { sq, en };

/** Replace {key} placeholders in a template string. */
export function interp(
  tpl: string,
  vars: Record<string, string | number>,
): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

interface I18nContext {
  lang: Lang;
  t: Dictionary;
  setLang: (l: Lang) => void;
}

const Ctx = createContext<I18nContext>({
  lang: "sq",
  t: sq,
  setLang: () => undefined,
});

interface LanguageProviderProps {
  children: ReactNode;
  /** Initial language read server-side from the cookie (or "sq"). */
  initialLang: Lang;
}

export function LanguageProvider({ children, initialLang }: LanguageProviderProps) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  // On the client, re-read the cookie in case it changed after hydration
  // (e.g. after a server/client render mismatch during first load).
  useEffect(() => {
    const fromCookie = parseLangCookie();
    if (fromCookie && fromCookie !== lang) {
      setLangState(fromCookie);
    }
    // Only run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    // Persist for 1 year; SameSite=Lax is fine for a preference cookie.
    document.cookie = `${COOKIE_NAME}=${l};path=/;max-age=31536000;SameSite=Lax`;
  }, []);

  return (
    <Ctx.Provider value={{ lang, t: DICTIONARIES[lang], setLang }}>
      {children}
    </Ctx.Provider>
  );
}

/** Access the current dictionary and language. Must be used inside <LanguageProvider>. */
export function useT(): Dictionary {
  return useContext(Ctx).t;
}

/** Access the full i18n context (lang, t, setLang). */
export function useI18n(): I18nContext {
  return useContext(Ctx);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse the lang cookie from document.cookie — browser-side only. */
function parseLangCookie(): Lang | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const value = match.slice(COOKIE_NAME.length + 1);
  return value === "en" || value === "sq" ? value : null;
}
