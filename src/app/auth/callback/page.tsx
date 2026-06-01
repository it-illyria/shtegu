"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Magic-link callback. Supabase puts auth tokens in window.location.hash
 * after a successful OTP. This placeholder strips the fragment and
 * redirects home so the tokens don't linger in URL/referrer.
 *
 * TODO: migrate to @supabase/ssr cookies (RT2 follow-up).
 */
export default function AuthCallback() {
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      // Strip fragment without adding history entry.
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    router.replace("/");
  }, [router]);
  return null;
}
