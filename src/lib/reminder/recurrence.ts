import type { Reminder, ReminderOccurrence } from "@/types/reminder";
import { addDays, daysBetween } from "@/lib/utils/date";

const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function weekdayKeyOf(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return WEEKDAY_KEYS[new Date(y, m - 1, d).getDay()];
}

/**
 * Expand a single reminder into its occurrence(s) within [windowStart, windowEnd] (inclusive, "YYYY-MM-DD").
 * One-off reminders return at most one occurrence (their own date, if within window).
 * Recurring reminders are computed on-the-fly — nothing is materialized in the DB.
 */
export function expandOccurrences(
  reminder: Reminder,
  windowStart: string,
  windowEnd: string
): ReminderOccurrence[] {
  if (!reminder.repeat_rule) {
    if (reminder.date < windowStart || reminder.date > windowEnd) return [];
    return [
      {
        reminder,
        occurrenceDate: reminder.date,
        isCompleted: reminder.status === "completed",
      },
    ];
  }

  const { frequency, interval, days, day_of_month } = reminder.repeat_rule;
  const occurrences: ReminderOccurrence[] = [];
  const startDate = reminder.date > windowStart ? reminder.date : windowStart;

  let cursor = startDate;
  let guard = 0;
  while (cursor <= windowEnd && guard < 400) {
    guard++;
    const elapsedDays = daysBetween(reminder.date, cursor);
    let matches = false;

    if (frequency === "daily") {
      matches = elapsedDays >= 0 && elapsedDays % interval === 0;
    } else if (frequency === "weekly") {
      const weekIndex = Math.floor(elapsedDays / 7);
      const inIntervalWeek = weekIndex >= 0 && weekIndex % interval === 0;
      matches =
        inIntervalWeek &&
        (days?.includes(weekdayKeyOf(cursor)) ??
          weekdayKeyOf(cursor) === weekdayKeyOf(reminder.date));
    } else if (frequency === "monthly") {
      const [, , dStr] = cursor.split("-");
      matches = Number(dStr) === (day_of_month ?? Number(reminder.date.split("-")[2]));
    } else if (frequency === "yearly") {
      const [, mStr, dStr] = cursor.split("-");
      const [, rmStr, rdStr] = reminder.date.split("-");
      matches = mStr === rmStr && dStr === rdStr;
    }

    if (matches) {
      occurrences.push({
        reminder,
        occurrenceDate: cursor,
        isCompleted: reminder.last_completed_date === cursor,
      });
    }
    cursor = addDays(cursor, 1);
  }

  return occurrences;
}

export function expandAllOccurrences(
  reminders: Reminder[],
  windowStart: string,
  windowEnd: string
): ReminderOccurrence[] {
  return reminders
    .flatMap((r) => expandOccurrences(r, windowStart, windowEnd))
    .sort((a, b) => {
      if (a.occurrenceDate !== b.occurrenceDate) {
        return a.occurrenceDate < b.occurrenceDate ? -1 : 1;
      }
      return a.reminder.time < b.reminder.time ? -1 : 1;
    });
}
