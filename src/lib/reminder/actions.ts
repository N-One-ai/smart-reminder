"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ok, err, type ActionResult } from "@/lib/action-result";
import { reminderInputSchema, reminderUpdateSchema } from "./schema";
import { toReminder } from "./mapper";
import type { Reminder } from "@/types/reminder";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createReminder(rawInput: unknown): Promise<ActionResult<Reminder>> {
  const { supabase, user } = await requireUser();
  if (!user) return err("UNAUTHORIZED", "Bạn cần đăng nhập để tạo lời nhắc");

  const parsed = reminderInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
  }
  const input = parsed.data;

  const { data, error } = await supabase
    .from("reminders")
    .insert({
      user_id: user.id,
      title: input.title,
      description: input.description,
      date: input.date,
      time: input.time,
      timezone: input.timezone,
      repeat_rule: input.recurrence,
      source: input.source,
      ai_confidence: input.ai_confidence,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("[createReminder]", error);
    return err("DB_ERROR", "Không thể lưu lời nhắc. Vui lòng thử lại.");
  }

  revalidatePath("/app");
  return ok(toReminder(data));
}

export async function updateReminder(
  id: string,
  rawPatch: unknown
): Promise<ActionResult<Reminder>> {
  const { supabase, user } = await requireUser();
  if (!user) return err("UNAUTHORIZED", "Bạn cần đăng nhập");

  const parsed = reminderUpdateSchema.safeParse(rawPatch);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
  }
  const patch = parsed.data;

  const { data, error } = await supabase
    .from("reminders")
    .update({
      ...(patch.title !== undefined && { title: patch.title }),
      ...(patch.description !== undefined && { description: patch.description }),
      ...(patch.date !== undefined && { date: patch.date }),
      ...(patch.time !== undefined && { time: patch.time }),
      ...(patch.recurrence !== undefined && { repeat_rule: patch.recurrence }),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) {
    console.error("[updateReminder]", error);
    return err("DB_ERROR", "Không thể lưu thay đổi. Vui lòng thử lại.");
  }

  revalidatePath("/app");
  return ok(toReminder(data));
}

export async function deleteReminder(id: string): Promise<ActionResult<null>> {
  const { supabase, user } = await requireUser();
  if (!user) return err("UNAUTHORIZED", "Bạn cần đăng nhập");

  const { error } = await supabase.from("reminders").delete().eq("id", id).eq("user_id", user.id);

  if (error) {
    console.error("[deleteReminder]", error);
    return err("DB_ERROR", "Không thể xoá lời nhắc. Vui lòng thử lại.");
  }

  revalidatePath("/app");
  return ok(null);
}

/**
 * One-off: toggles status pending <-> completed.
 * Recurring: toggles last_completed_date for just this occurrence, series stays 'pending'.
 * See prd-smart-reminder.md §C for why "complete" never disables a whole recurring series.
 */
export async function completeOccurrence(
  id: string,
  occurrenceDate: string
): Promise<ActionResult<Reminder>> {
  const { supabase, user } = await requireUser();
  if (!user) return err("UNAUTHORIZED", "Bạn cần đăng nhập");

  const { data: existing, error: fetchError } = await supabase
    .from("reminders")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) {
    return err("NOT_FOUND", "Không tìm thấy lời nhắc này");
  }

  const update = existing.repeat_rule
    ? {
        last_completed_date: existing.last_completed_date === occurrenceDate ? null : occurrenceDate,
      }
    : {
        status: existing.status === "completed" ? ("pending" as const) : ("completed" as const),
        completed_at: existing.status === "completed" ? null : new Date().toISOString(),
      };

  const { data, error } = await supabase
    .from("reminders")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) {
    console.error("[completeOccurrence]", error);
    return err("DB_ERROR", "Không thể cập nhật trạng thái. Vui lòng thử lại.");
  }

  revalidatePath("/app");
  return ok(toReminder(data));
}

/**
 * Callable from the client (unlike lib/reminder/queries.ts, which is server-component-only)
 * so useNotifications can poll for due reminders while the app is open. `todayDateKey` is
 * supplied by the caller's own clock — never computed here, since the server's timezone
 * may not match the viewer's (see prd-smart-reminder.md §17).
 */
export async function getTodayReminders(todayDateKey: string): Promise<ActionResult<Reminder[]>> {
  const { supabase, user } = await requireUser();
  if (!user) return err("UNAUTHORIZED", "Bạn cần đăng nhập");

  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("user_id", user.id)
    .or(`repeat_rule.not.is.null,date.eq.${todayDateKey}`);

  if (error) {
    console.error("[getTodayReminders]", error);
    return err("DB_ERROR", "Không thể tải lời nhắc.");
  }

  return ok((data ?? []).map(toReminder));
}

/** Marks a reminder as notified now — prevents useNotifications from firing it again today. */
export async function markNotified(id: string): Promise<ActionResult<null>> {
  const { supabase, user } = await requireUser();
  if (!user) return err("UNAUTHORIZED", "Bạn cần đăng nhập");

  const { error } = await supabase
    .from("reminders")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[markNotified]", error);
    return err("DB_ERROR", "Không thể cập nhật trạng thái thông báo.");
  }

  return ok(null);
}
