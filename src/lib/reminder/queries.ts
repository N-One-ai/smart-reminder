import { createClient } from "@/lib/supabase/server";
import type { Reminder } from "@/types/reminder";
import { toReminder } from "./mapper";

/** Plain reads for Server Components — not Server Actions (those are for mutations). */

/**
 * Fetch every reminder relevant to [windowStart, windowEnd]: one-off reminders whose
 * own date falls in the window, plus ALL recurring reminders (any origin date) since
 * a recurring rule can still be producing occurrences inside the window regardless of
 * how long ago it was created. Occurrence expansion itself happens in
 * lib/reminder/recurrence.ts — this only narrows what we pull from the DB.
 */
export async function getRemindersForWindow(
  windowStart: string,
  windowEnd: string
): Promise<Reminder[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("user_id", user.id)
    .or(`repeat_rule.not.is.null,and(date.gte.${windowStart},date.lte.${windowEnd})`);

  if (error) {
    console.error("[getRemindersForWindow]", error);
    // Never swallow a real DB/network error into an empty list — that reads to the
    // user as "all my reminders vanished" instead of "the app hit an error".
    // The nearest app/error.tsx boundary shows a retry UI for this.
    throw new Error("Không thể tải lời nhắc. Vui lòng thử lại.");
  }

  return (data ?? []).map(toReminder);
}

export async function getCompletedReminders(): Promise<Reminder[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("[getCompletedReminders]", error);
    throw new Error("Không thể tải lời nhắc. Vui lòng thử lại.");
  }

  return (data ?? []).map(toReminder);
}

export async function getReminderById(id: string): Promise<Reminder | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[getReminderById]", error);
    throw new Error("Không thể tải lời nhắc. Vui lòng thử lại.");
  }
  if (!data) return null; // genuinely doesn't exist (or belongs to another user) — not an error

  return toReminder(data);
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? "",
    name: profile?.name ?? "",
    timezone: profile?.timezone ?? "Asia/Ho_Chi_Minh",
  };
}
