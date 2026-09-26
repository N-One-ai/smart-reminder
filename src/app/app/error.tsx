"use client";

import { AppErrorState } from "@/components/layout/app-error-state";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AppErrorState error={error} reset={reset} />;
}
