"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RymiLogo } from "@/components/layout/rymi-logo";
import { cn } from "@/lib/utils";
import { useDictionary } from "@/lib/i18n/locale-provider";

// Real auth-check time drives navigation, per spec — this is only a floor so
// the brand moment never feels like a flicker on a fast/cached session.
const MIN_DISPLAY_MS = 800;
const EXIT_DURATION_MS = 250;

/**
 * App entry gate — replaces the old marketing landing page at "/". Every
 * open (browser tab, PWA cold start — see manifest.ts start_url) lands here
 * first: check the Supabase session, decide the ONE correct destination,
 * then navigate straight there. Never routes through /login on the way to
 * /app (or vice versa) — the decision is made before any navigation happens.
 */
export function SplashScreen() {
  const router = useRouter();
  const dict = useDictionary();
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    async function run() {
      let destination = "/login";
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data.session) destination = "/app";
      } catch (e) {
        // Never show a raw error or a blank screen — worst case, the user
        // just lands on /login same as a fresh visitor.
        console.error("[SplashScreen] session check failed", e);
      }

      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
      if (cancelled) return;

      setExiting(true);
      await new Promise((resolve) => setTimeout(resolve, EXIT_DURATION_MS));
      if (cancelled) return;

      router.replace(destination);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[#0B0B0D] transition-opacity duration-[250ms] ease-out",
        exiting ? "opacity-0" : "opacity-100"
      )}
    >
      <RymiLogo className="h-14 w-auto text-primary animate-in fade-in zoom-in-95 duration-500 ease-out" />
      <p className="text-white/50 text-xs animate-in fade-in duration-500 delay-100 fill-mode-both">
        {dict.splash.tagline}
      </p>
    </div>
  );
}
