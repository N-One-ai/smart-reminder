"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shared by every route-segment error.tsx boundary under /app and /settings. */
export function AppErrorState({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-5 text-destructive" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{error.message || "Đã xảy ra lỗi."}</p>
        <p className="text-xs text-muted-foreground">Kiểm tra kết nối Internet và thử lại.</p>
      </div>
      <Button onClick={reset} size="sm">
        Thử lại
      </Button>
    </div>
  );
}
