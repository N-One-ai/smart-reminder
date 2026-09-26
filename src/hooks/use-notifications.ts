"use client";

import { useEffect, useRef } from "react";
import { getTodayReminders, markNotified } from "@/lib/reminder/actions";
import { expandOccurrences } from "@/lib/reminder/recurrence";
import { isDueForNotification } from "@/lib/reminder/notification";
import { todayKey } from "@/lib/utils/date";

const POLL_INTERVAL_MS = 20_000;

/**
 * Client-side only notification scheduler (per prd-smart-reminder.md decision log:
 * MVP intentionally skips Web Push / Service Worker — this only fires while the
 * app tab is open and in the foreground). Polls the DB every 20s for reminders
 * due "now", fires a browser Notification, and marks them notified so they don't
 * fire again on the next poll or from another open tab.
 */
export function useNotifications() {
  const firingRef = useRef(new Set<string>());

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    let cancelled = false;

    async function checkDue() {
      if (Notification.permission !== "granted") return;

      const today = todayKey();
      const res = await getTodayReminders(today);
      if (!res.ok || cancelled) return;

      const now = new Date();

      for (const reminder of res.data) {
        // A reminder fetched "for today" may be a recurring rule whose actual
        // occurrence today needs expanding (weekly/monthly/yearly rules aren't
        // necessarily due every day) — reuse the same expansion logic the UI uses.
        const occurrences = expandOccurrences(reminder, today, today);
        for (const occ of occurrences) {
          const key = `${occ.reminder.id}-${occ.occurrenceDate}`;
          if (firingRef.current.has(key)) continue;
          if (!isDueForNotification(occ, now)) continue;

          firingRef.current.add(key);
          new Notification("Smart Reminder", {
            body: `Đã đến lúc: ${occ.reminder.title}`,
            tag: key,
          });
          await markNotified(occ.reminder.id);
        }
      }
    }

    checkDue();
    const interval = setInterval(checkDue, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);
}
