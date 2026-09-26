"use client";

import { useNotifications } from "@/hooks/use-notifications";

/** No UI — just runs the polling/firing side effect for as long as the app shell is mounted. */
export function NotificationScheduler() {
  useNotifications();
  return null;
}
