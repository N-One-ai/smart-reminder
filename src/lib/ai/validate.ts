import { z } from "zod";
import { recurrenceRuleSchema } from "@/lib/reminder/schema";

/**
 * Validates raw AI output before it's ever shown as a Preview or saved.
 * Per prd-smart-reminder.md §D: parse failure / schema mismatch → retry once,
 * then surface a real error — never fabricate missing fields, never save
 * unvalidated data. See lib/ai/actions.ts for the retry + error path.
 */
export const aiParseResultSchema = z
  .object({
    intent: z.enum(["create_reminder", "needs_clarification"]),
    title: z.string().trim().min(1).nullable(),
    description: z.string().default(""),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    time: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .nullable(),
    timezone: z.string().min(1),
    recurrence: recurrenceRuleSchema.nullable(),
    confidence: z.number().min(0).max(1),
    missing_field: z.enum(["title", "datetime"]).nullable(),
    clarification_question: z.string().nullable(),
    suggestions: z.array(z.string()).optional(),
  })
  .refine(
    (v) => v.intent === "create_reminder" ? v.title !== null && v.date !== null && v.time !== null : true,
    { message: "create_reminder requires title, date and time to be non-null" }
  )
  .refine(
    (v) =>
      v.intent === "needs_clarification"
        ? v.missing_field !== null && v.clarification_question !== null
        : true,
    { message: "needs_clarification requires missing_field and clarification_question" }
  );

export type ValidatedAIParseResult = z.infer<typeof aiParseResultSchema>;

/** Natural-language editing (V2) — see lib/ai/prompt.ts EDIT_SYSTEM_INSTRUCTION. */
export const aiEditResultSchema = z.object({
  title: z.string().trim().min(1),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/),
  recurrence: recurrenceRuleSchema.nullable(),
  confidence: z.number().min(0).max(1),
});

export type ValidatedAIEditResult = z.infer<typeof aiEditResultSchema>;
