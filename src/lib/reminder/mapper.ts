import type { Reminder } from "@/types/reminder";
import type { Database } from "@/types/database";

type ReminderRow = Database["public"]["Tables"]["reminders"]["Row"];

/** Shared by lib/reminder/queries.ts (reads) and lib/reminder/actions.ts (mutations). */
export function toReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.description,
    date: row.date,
    time: row.time.slice(0, 5), // "HH:MM:SS" -> "HH:MM"
    timezone: row.timezone,
    repeat_rule: row.repeat_rule,
    status: row.status,
    completed_at: row.completed_at,
    last_completed_date: row.last_completed_date,
    notified_at: row.notified_at,
    source: row.source,
    ai_confidence: row.ai_confidence,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
