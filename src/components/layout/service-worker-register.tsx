"use client";

import { useEffect } from "react";

/**
 * Registers the minimal offline-fallback service worker (public/sw.js).
 * Production-only: registering a SW during dev fights with Turbopack's Fast
 * Refresh (stale-worker-serves-old-JS is a well-known footgun) and buys
 * nothing here since the worker never caches app code, only the static
 * offline page.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("[sw] registration failed", err);
    });
  }, []);

  return null;
}
