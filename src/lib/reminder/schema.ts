import { z } from "zod";

// Gemini's structured output fills every declared property regardless of
// relevance (e.g. day_of_month=0, days=[] on a daily/yearly rule) rather than
// omitting unused ones — accept 0/empty here and strip them below so only
// the fields that actually apply to `frequency` survive into storage.
export const recurrenceRuleSchema = z
  .object({
    frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
    interval: z.number().int().positive(),
    days: z.array(z.string()).optional(),
    day_of_month: z.number().int().min(0).max(31).optional(),
  })
  .transform((rule) => ({
    frequency: rule.frequency,
    interval: rule.interval,
    days: rule.frequency === "weekly" && rule.days?.length ? rule.days : undefined,
    day_of_month:
      rule.frequency === "monthly" && rule.day_of_month ? rule.day_of_month : undefined,
  }));

export const reminderInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Việc cần làm không được để trống")
    .max(200, "Tên việc quá dài (tối đa 200 ký tự)"),
  description: z.string().max(2000, "Ghi chú quá dài (tối đa 2000 ký tự)").default(""),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Giờ không hợp lệ"),
  timezone: z.string().min(1),
  recurrence: recurrenceRuleSchema.nullable(),
  source: z.enum(["ai", "manual"]).default("manual"),
  ai_confidence: z.number().min(0).max(1).nullable().default(null),
});

export type ReminderInput = z.infer<typeof reminderInputSchema>;

export const reminderUpdateSchema = reminderInputSchema.partial();
export type ReminderUpdateInput = z.infer<typeof reminderUpdateSchema>;
