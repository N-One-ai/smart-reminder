import type { Reminder } from "@/types/reminder";
import { expandAllOccurrences } from "./recurrence";
import { addDays } from "@/lib/utils/date";

/** Mon..Sun short labels, matching the Monday-start calendar week below. */
const WEEKDAY_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export interface WeeklyProgressDay {
  dateKey: string;
  label: string; // "T2".."T7", "CN"
  isCompleted: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export interface WeeklyProgress {
  completedDays: number;
  totalDays: number;
  days: WeeklyProgressDay[];
  weekStart: string;
  weekEnd: string;
}

/**
 * Mon–Sun calendar week containing `today` — a day "counts" the moment
 * anything on it got checked off, not a strict all-done requirement (Rule 5:
 * keep it simple). Returns a per-day breakdown so the dashboard can render
 * one dot per weekday instead of just a single completed/total count.
 */
export function computeWeeklyProgress(reminders: Reminder[], today: string): WeeklyProgress {
  const [y, m, d] = today.split("-").map(Number);
  const jsDay = new Date(y, m - 1, d).getDay(); // 0=Sun..6=Sat
  const offsetFromMonday = (jsDay + 6) % 7;
  const weekStart = addDays(today, -offsetFromMonday);
  const weekEnd = addDays(weekStart, 6);

  const occurrences = expandAllOccurrences(reminders, weekStart, weekEnd);
  const daysWithCompletion = new Set<string>();
  for (const occ of occurrences) {
    if (occ.isCompleted) daysWithCompletion.add(occ.occurrenceDate);
  }

  const days: WeeklyProgressDay[] = Array.from({ length: 7 }, (_, i) => {
    const dateKey = addDays(weekStart, i);
    return {
      dateKey,
      label: WEEKDAY_SHORT[i],
      isCompleted: daysWithCompletion.has(dateKey),
      isToday: dateKey === today,
      isFuture: dateKey > today,
    };
  });

  return {
    completedDays: daysWithCompletion.size,
    totalDays: 7,
    days,
    weekStart,
    weekEnd,
  };
}

export function countPendingToday(reminders: Reminder[], today: string): number {
  return expandAllOccurrences(reminders, today, today).filter((o) => !o.isCompleted).length;
}

export function countCompletedToday(reminders: Reminder[], today: string): number {
  return expandAllOccurrences(reminders, today, today).filter((o) => o.isCompleted).length;
}
