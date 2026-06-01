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
    // Keep shtegu_gear_checked, shtegu_alerts_dismissed, shtegu_otp_last:* alone —
    // those are device-scoped UX, not identity data.
    try {
      localStorage.removeItem("shtegu_bookmarks");
      localStorage.removeItem("shtegu_username");
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
