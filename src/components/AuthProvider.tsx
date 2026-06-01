"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface SignInResult {
  error: string | null;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
}

// Hardcoded production origin so a malicious clone can't have the magic
// link redirect to its own domain. Override locally via NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN.
const AUTH_REDIRECT_ORIGIN =
  process.env.NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN?.trim() ||
  "https://shtegu.vercel.app";

const AuthContext = createContext<AuthContextValue | null>(null);

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // RT4-M9: cross-tab auth sync. Supabase persists the session in localStorage
  // under sb-<projectRef>-auth-token; a sign-in/out in another tab fires a
  // `storage` event that this tab otherwise misses until the next reload.
  useEffect(() => {
    if (!supabase) return;
    function onStorage(e: StorageEvent) {
      // Match any Supabase auth-token key. The project ref isn't always
      // derivable from window-set NEXT_PUBLIC_SUPABASE_URL (custom domains,
      // CNAMEs), so we identify by pattern.
      if (!e.key || !/^sb-[a-z0-9]+-auth-token$/.test(e.key)) return;
      void supabase!.auth.getSession().then(({ data }) => {
        setUser(data.session?.user ?? null);
      });
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // RT4-LOW: refresh auth state on BFCache restore. Safari/Firefox restore the
  // page without re-running effects; if the user signed out in another tab
  // while this one was in BFCache, we'd render stale authed UI until interaction.
  useEffect(() => {
    if (!supabase) return;
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) {
        void supabase!.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
      }
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const signInWithEmail = useCallback(
    async (email: string): Promise<SignInResult> => {
      if (!supabase) {
        return { error: "Supabase is not configured." };
      }
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: AUTH_REDIRECT_ORIGIN,
        },
      });
      return { error: error?.message ?? null };
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    // Clear shared local state so the next user on the same device doesn't inherit it.
    // Keep shtegu_gear_checked, shtegu_alerts_dismissed alone —
    // those are device-scoped UX, not identity data.
    try {
      localStorage.removeItem("shtegu_bookmarks");
      localStorage.removeItem("shtegu_username");
    } catch {}
    // RT4-M1: sweep per-email OTP rate-limit timestamps. They key off the
    // email address, which is identity data — leaving them lets the next user
    // on the device leak who previously requested an OTP here.
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith("shtegu_otp_last:")) localStorage.removeItem(k);
      }
    } catch {}
    // RT4-M10: ask the SW to drop navigation-cached HTML so the next user
    // doesn't see the previous user's authed pages from cache.
    try {
      navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_USER_CACHE" });
    } catch {}
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signInWithEmail, signOut }),
    [user, loading, signInWithEmail, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}
