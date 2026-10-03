import type { PublicProfile } from "./profile";

export type ReminderStatus = "pending" | "completed";
export type ReminderSource = "ai" | "manual";
export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  days?: string[]; // only for weekly — e.g. ["monday"]
  day_of_month?: number; // only for monthly
}

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description: string;
  date: string; // "YYYY-MM-DD" — civil date, not UTC-shifted
  time: string; // "HH:MM" 24h
  timezone: string; // IANA tz name, e.g. "Asia/Ho_Chi_Minh"
  repeat_rule: RecurrenceRule | null;
  status: ReminderStatus;
  completed_at: string | null;
  last_completed_date: string | null; // for recurring: which occurrence was ticked
  notified_at: string | null; // last time a Notification fired for the current occurrence
  source: ReminderSource;
  ai_confidence: number | null;
  /** The single accepted Connection this reminder is shared with, if any — set by the owner only. */
  shared_with_user_id: string | null;
  created_at: string;
  updated_at: string;
  /** Not a DB column — the "other party"'s public profile (the recipient if
   * you're the owner, the owner if you're the recipient), resolved
   * separately in lib/reminder/queries.ts for display ("🔗 Với ..."). */
  sharedWithUser?: PublicProfile | null;
  /** Not a DB column — true when the current viewer is the recipient, not
   * the owner. Drives read-only UI (no edit/delete/complete). */
  isSharedWithMe?: boolean;
}

/** A single computed occurrence of a reminder, expanded from repeat_rule for display. */
export interface ReminderOccurrence {
  reminder: Reminder;
  occurrenceDate: string; // "YYYY-MM-DD" — the specific date this occurrence falls on
  isCompleted: boolean; // resolved from status (one-off) or last_completed_date (recurring)
}

export interface DayGroup {
  label: string; // "Hôm nay" | "Ngày mai" | "Thứ 7" | "28/09" | ...
  dateKey: string; // "YYYY-MM-DD"
  occurrences: ReminderOccurrence[];
}
