"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type Theme = "light" | "dark" | "system";

const COOKIE = "shtegu_theme";

interface ThemeCtx {
  theme: Theme;
  /** The resolved value actually applied ("light" or "dark"). */
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
}

const Ctx = createContext<ThemeCtx>({
  theme: "system",
  resolved: "light",
  setTheme: () => undefined,
});

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [resolved, setResolved] = useState<"light" | "dark">(
    initialTheme === "dark" ? "dark" : "light",
  );

  // Apply data-theme attribute and persist cookie.
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    const html = document.documentElement;
    if (t === "system") {
      html.removeAttribute("data-theme");
    } else {
      html.setAttribute("data-theme", t);
    }
    document.cookie = `${COOKIE}=${t};path=/;max-age=31536000;SameSite=Lax`;
  }, []);

  // Sync resolved value whenever theme or system preference changes.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      const r = theme === "system" ? (mq.matches ? "dark" : "light") : theme;
      setResolved(r);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [theme]);

  // On first mount, apply the saved theme to avoid a flash.
  useEffect(() => {
    const html = document.documentElement;
    if (theme !== "system") html.setAttribute("data-theme", theme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Ctx.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  return useContext(Ctx);
}
