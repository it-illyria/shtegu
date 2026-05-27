"use client";

import { useEffect } from "react";

/** Registers the offline service worker once, client-side. Renders nothing. */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((err) => console.error("SW registration failed:", err));
  }, []);

  return null;
}
