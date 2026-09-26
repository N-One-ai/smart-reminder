import type { RecurrenceRule } from "./reminder";

export interface AIParseInput {
  text: string;
  currentDate: string; // "YYYY-MM-DD"
  currentTime: string; // "HH:MM"
  timezone: string;
  dayOfWeek: string;
}

export type MissingField = "title" | "datetime" | null;

export interface AIParseResult {
  intent: "create_reminder" | "needs_clarification";
  title: string | null;
  description: string;
  date: string | null;
  time: string | null;
  timezone: string;
  recurrence: RecurrenceRule | null;
  confidence: number;
  missing_field: MissingField;
  clarification_question: string | null;
  suggestions?: string[];
}

/** Natural-language editing (V2) — see prd-smart-reminder.md V2 roadmap. */
export interface AIEditInput {
  currentTitle: string;
  currentDate: string; // reminder's existing date, "YYYY-MM-DD"
  currentTime: string; // reminder's existing time, "HH:MM"
  currentRecurrence: RecurrenceRule | null;
  editText: string;
  timezone: string;
  today: string; // client's *current* date, for relative expressions in the edit text
  nowTime: string;
  dayOfWeek: string;
}

export interface AIEditResult {
  title: string;
  date: string;
  time: string;
  recurrence: RecurrenceRule | null;
  confidence: number;
}
