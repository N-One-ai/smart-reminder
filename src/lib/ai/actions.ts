"use server";

import { ok, err, type ActionResult } from "@/lib/action-result";
import { getAIProvider } from "./provider";
import {
  aiParseResultSchema,
  aiEditResultSchema,
  type ValidatedAIParseResult,
  type ValidatedAIEditResult,
} from "./validate";
import { createClient } from "@/lib/supabase/server";
import type { AIParseInput, AIEditInput } from "@/types/ai";

/**
 * AI never writes to the database — this only returns validated structured
 * output for the client to preview. createReminder (lib/reminder/actions.ts)
 * is a separate, explicit step the user must confirm. See prd-smart-reminder.md §15.
 */
export async function parseReminderText(
  input: AIParseInput
): Promise<ActionResult<ValidatedAIParseResult>> {
  // Server Actions are callable directly (not just from the UI) — without this,
  // anyone with the app's URL could hit the Gemini API for free at our expense
  // without ever signing up.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("UNAUTHORIZED", "Bạn cần đăng nhập để dùng Smart Input");

  if (!input.text.trim()) {
    return err("VALIDATION_ERROR", "Vui lòng nhập nội dung cần nhớ");
  }
  if (input.text.length > 500) {
    return err("VALIDATION_ERROR", "Nội dung quá dài. Vui lòng nhập ngắn gọn hơn.");
  }

  const provider = getAIProvider();

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await provider.parseReminder(input);
      const parsed = aiParseResultSchema.safeParse(raw);

      if (parsed.success) {
        return ok(parsed.data);
      }

      console.error(`[parseReminderText] validation failed (attempt ${attempt})`, parsed.error.issues);
      if (attempt === 2) {
        return err(
          "INVALID_AI_OUTPUT",
          "Smart Reminder chưa hiểu được yêu cầu. Hãy thử diễn đạt khác."
        );
      }
    } catch (e) {
      console.error(`[parseReminderText] provider error (attempt ${attempt})`, e);
      if (attempt === 2) {
        return err("AI_ERROR", "Smart Reminder chưa hiểu được yêu cầu. Hãy thử lại.");
      }
    }
  }

  // Unreachable, but keeps TypeScript satisfied.
  return err("AI_ERROR", "Smart Reminder chưa hiểu được yêu cầu. Hãy thử lại.");
}

/**
 * Natural-language editing (V2) — applies a short edit instruction to an
 * existing reminder's fields. Returns validated structured output only;
 * the caller (reminder detail UI) still shows a confirm step before actually
 * calling updateReminder, same "AI never writes to the DB" rule as above.
 */
export async function parseReminderEdit(
  input: AIEditInput
): Promise<ActionResult<ValidatedAIEditResult>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("UNAUTHORIZED", "Bạn cần đăng nhập để dùng tính năng này");

  if (!input.editText.trim()) {
    return err("VALIDATION_ERROR", "Vui lòng nhập nội dung chỉnh sửa");
  }
  if (input.editText.length > 500) {
    return err("VALIDATION_ERROR", "Nội dung quá dài. Vui lòng nhập ngắn gọn hơn.");
  }

  const provider = getAIProvider();

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await provider.parseEdit(input);
      const parsed = aiEditResultSchema.safeParse(raw);

      if (parsed.success) {
        return ok(parsed.data);
      }

      console.error(`[parseReminderEdit] validation failed (attempt ${attempt})`, parsed.error.issues);
      if (attempt === 2) {
        return err(
          "INVALID_AI_OUTPUT",
          "Smart Reminder chưa hiểu được yêu cầu chỉnh sửa. Hãy thử diễn đạt khác."
        );
      }
    } catch (e) {
      console.error(`[parseReminderEdit] provider error (attempt ${attempt})`, e);
      if (attempt === 2) {
        return err("AI_ERROR", "Smart Reminder chưa hiểu được yêu cầu. Hãy thử lại.");
      }
    }
  }

  // Unreachable, but keeps TypeScript satisfied.
  return err("AI_ERROR", "Smart Reminder chưa hiểu được yêu cầu. Hãy thử lại.");
}
