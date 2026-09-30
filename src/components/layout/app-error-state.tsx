"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/lib/i18n/locale-provider";

/** Shared by every route-segment error.tsx boundary under /app and /settings. */
export function AppErrorState({ error, reset }: { error: Error; reset: () => void }) {
  const dict = useDictionary();
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-5 text-destructive" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{error.message || dict.common.genericError}</p>
        <p className="text-xs text-muted-foreground">{dict.common.checkConnection}</p>
      </div>
      <Button onClick={reset} size="sm">
        {dict.common.tryAgain}
      </Button>
    </div>
  );
}
