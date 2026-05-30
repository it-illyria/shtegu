"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

const LS_KEY = "shtegu_bookmarks";

function readLS(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return new Set(parsed as string[]);
  } catch {
    // ignore parse errors
  }
  return new Set();
}

function writeLS(slugs: Set<string>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...slugs]));
  } catch {
    // ignore storage errors
  }
}

export function useBookmarks(): {
  bookmarks: Set<string>;
  toggle: (slug: string) => void;
  loading: boolean;
} {
  const { user, loading: authLoading } = useAuth();
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Track whether we've already migrated localStorage → DB for this user session
  const migratedRef = useRef<string | null>(null);

  // Signed-in (non-anonymous) DB user — key off the ID so the effect doesn't
  // refire just because `user` is a new object reference each render.
  const signedInUserId =
    user && !user.is_anonymous ? user.id : null;
  const signedInUser = useMemo(
    () => (signedInUserId ? { id: signedInUserId } : null),
    [signedInUserId],
  );

  // ── Load bookmarks ────────────────────────────────────────────────────────

  useEffect(() => {
    if (authLoading) return;

    async function load() {
      // Always read localStorage first (fast optimistic state)
      const local = readLS();

      if (!isSupabaseConfigured || !supabase || !signedInUser) {
        // No DB: use only localStorage
        setBookmarks(local);
        setLoading(false);
        return;
      }

      // Migrate localStorage slugs to DB (once per user session)
      if (migratedRef.current !== signedInUser.id && local.size > 0) {
        migratedRef.current = signedInUser.id;
        const rows = [...local].map((slug) => ({
          user_id: signedInUser.id,
          trail_slug: slug,
        }));
        // upsert ignores duplicates via the primary key
        await supabase
          .from("saved_trails")
          .upsert(rows, { onConflict: "user_id,trail_slug" });
      }

      // Read from DB (source of truth for signed-in users)
      const { data, error } = await supabase
        .from("saved_trails")
        .select("trail_slug")
        .eq("user_id", signedInUser.id);

      if (!error && data) {
        const dbSlugs = new Set(data.map((r: { trail_slug: string }) => r.trail_slug));
        setBookmarks(dbSlugs);
        // Keep localStorage in sync for offline/anonymous reads
        writeLS(dbSlugs);
      } else {
        // DB unavailable — fall back to localStorage
        setBookmarks(local);
      }

      setLoading(false);
    }

    void load();
  }, [authLoading, signedInUserId]);

  // ── Toggle ────────────────────────────────────────────────────────────────

  const toggle = useCallback(
    (slug: string) => {
      setBookmarks((prev) => {
        const next = new Set(prev);
        if (next.has(slug)) {
          next.delete(slug);
        } else {
          next.add(slug);
        }
        writeLS(next);
        return next;
      });

      // Fire-and-forget DB op for signed-in users
      if (!isSupabaseConfigured || !supabase) return;

      void (async () => {
        // Ensure we have a session (same pattern as Reviews.tsx)
        let userId = signedInUserId;
        if (!userId) {
          const { data: sessionData } = await supabase!.auth.getSession();
          userId = sessionData.session?.user?.id;
        }
        if (!userId) {
          // Anonymous bookmark — already stored in localStorage; skip DB
          return;
        }

        // Read current server state to decide insert vs delete
        const { data: existing } = await supabase!
          .from("saved_trails")
          .select("trail_slug")
          .eq("user_id", userId)
          .eq("trail_slug", slug)
          .maybeSingle();

        if (existing) {
          await supabase!
            .from("saved_trails")
            .delete()
            .eq("user_id", userId)
            .eq("trail_slug", slug);
        } else {
          await supabase!
            .from("saved_trails")
            .insert({ user_id: userId, trail_slug: slug });
        }
      })();
    },
    [signedInUserId],
  );

  return { bookmarks, toggle, loading: authLoading || loading };
}
