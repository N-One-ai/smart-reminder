import type { ReminderOccurrence } from "@/types/reminder";
import { zonedTimeToUtc } from "@/lib/utils/timezone";

/** Don't fire for anything more than this many minutes overdue — avoids a flood of
 * stale notifications when the user reopens a tab that's been idle for a while. */
const GRACE_WINDOW_MS = 5 * 60 * 1000;

/**
 * True if this occurrence is due, not yet notified today, and still within the
 * grace window. Pure function — no DOM/Notification API calls — so it's easy to
 * unit-test the actual "when should this fire" decision separately from the
 * browser-facing hook that acts on it.
 */
export function isDueForNotification(occ: ReminderOccurrence, now: Date): boolean {
  if (occ.isCompleted) return false;

  const dueAt = zonedTimeToUtc(occ.occurrenceDate, occ.reminder.time, occ.reminder.timezone);
  const elapsedMs = now.getTime() - dueAt.getTime();
  if (elapsedMs < 0 || elapsedMs > GRACE_WINDOW_MS) return false;

  const notifiedAt = occ.reminder.notified_at;
  if (!notifiedAt) return true;

  // For recurring reminders, notified_at from a *previous* occurrence shouldn't
  // suppress today's — only skip if we already notified for this exact occurrence.
  const notifiedDateInTz = new Intl.DateTimeFormat("en-CA", {
    timeZone: occ.reminder.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(notifiedAt)); // "en-CA" formats as YYYY-MM-DD

  return notifiedDateInTz !== occ.occurrenceDate;
}
