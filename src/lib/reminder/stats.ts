import type { Reminder } from "@/types/reminder";
import { expandAllOccurrences } from "./recurrence";
import { addDays } from "@/lib/utils/date";

/**
 * Counts how many of the last 7 days (today included) had at least one
 * completed reminder — the "streak-ish" number the dashboard's progress
 * ring shows. Deliberately simple (Rule 5): a day "counts" the moment
 * anything on it got checked off, not a strict all-done requirement.
 */
export function computeWeeklyProgress(
  reminders: Reminder[],
  today: string
): { completedDays: number; totalDays: number } {
  const weekStart = addDays(today, -6);
  const occurrences = expandAllOccurrences(reminders, weekStart, today);

  const daysWithCompletion = new Set<string>();
  for (const occ of occurrences) {
    if (occ.isCompleted) daysWithCompletion.add(occ.occurrenceDate);
  }

  return { completedDays: daysWithCompletion.size, totalDays: 7 };
}

export function countPendingToday(reminders: Reminder[], today: string): number {
  return expandAllOccurrences(reminders, today, today).filter((o) => !o.isCompleted).length;
}

export function countCompletedToday(reminders: Reminder[], today: string): number {
  return expandAllOccurrences(reminders, today, today).filter((o) => o.isCompleted).length;
}
