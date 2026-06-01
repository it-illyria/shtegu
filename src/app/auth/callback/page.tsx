"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Magic-link callback. Supabase puts auth tokens in window.location.hash
 * after a successful OTP. We strip the fragment via an inline script that
 * runs synchronously before any user script / React hydration, narrowing
 * the window in which tokens are observable to in-page scripts or via
 * referrer leakage.
 *
 * TODO: migrate to @supabase/ssr cookies (RT2 follow-up).
 */

// Inline script that runs SYNCHRONOUSLY in the head, before any user script.
// Strips the OAuth/OTP hash so tokens never enter the DOM or referrer.
const STRIP_HASH_SCRIPT = `
  (function() {
    try {
      if (window.location.hash) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch (e) {}
  })();
`;

export default function AuthCallback() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: STRIP_HASH_SCRIPT }} />
      <p style={{ padding: 20, fontFamily: "sans-serif" }}>Signing you in…</p>
    </>
  );
}
