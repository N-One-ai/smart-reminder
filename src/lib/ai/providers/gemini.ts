import { GoogleGenAI, Type, type Schema } from "@google/genai";
import type { AIProvider } from "../types";
import type { AIParseInput, AIEditInput } from "@/types/ai";
import {
  SYSTEM_INSTRUCTION,
  buildUserContent,
  EDIT_SYSTEM_INSTRUCTION,
  buildEditUserContent,
} from "../prompt";

const MODEL = "gemini-flash-latest";

const RECURRENCE_SCHEMA: Schema = {
  type: Type.OBJECT,
  nullable: true,
  properties: {
    frequency: { type: Type.STRING, enum: ["daily", "weekly", "monthly", "yearly"] },
    interval: { type: Type.INTEGER },
    days: { type: Type.ARRAY, items: { type: Type.STRING } },
    day_of_month: { type: Type.INTEGER },
  },
  required: ["frequency", "interval"],
};

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    intent: { type: Type.STRING, enum: ["create_reminder", "needs_clarification"] },
    title: { type: Type.STRING, nullable: true },
    description: { type: Type.STRING },
    date: { type: Type.STRING, nullable: true, description: "YYYY-MM-DD" },
    time: { type: Type.STRING, nullable: true, description: "HH:MM, 24h" },
    timezone: { type: Type.STRING },
    recurrence: RECURRENCE_SCHEMA,
    confidence: { type: Type.NUMBER },
    missing_field: { type: Type.STRING, enum: ["title", "datetime"], nullable: true },
    clarification_question: { type: Type.STRING, nullable: true },
    suggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        "Optional related sub-task titles when the input describes an event with " +
        "obvious follow-up tasks (e.g. a flight, an appointment). Empty array otherwise.",
    },
  },
  required: [
    "intent",
    "title",
    "description",
    "date",
    "time",
    "timezone",
    "recurrence",
    "confidence",
    "missing_field",
    "clarification_question",
    "suggestions",
  ],
};

const EDIT_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    date: { type: Type.STRING, description: "YYYY-MM-DD" },
    time: { type: Type.STRING, description: "HH:MM, 24h" },
    recurrence: RECURRENCE_SCHEMA,
    confidence: { type: Type.NUMBER },
  },
  required: ["title", "date", "time", "recurrence", "confidence"],
};

export class GeminiProvider implements AIProvider {
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async parseReminder(input: AIParseInput): Promise<unknown> {
    const response = await this.client.models.generateContent({
      model: MODEL,
      contents: buildUserContent(input),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.1,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini trả về phản hồi rỗng");
    }

    return JSON.parse(text);
  }

  async parseEdit(input: AIEditInput): Promise<unknown> {
    const response = await this.client.models.generateContent({
      model: MODEL,
      contents: buildEditUserContent(input),
      config: {
        systemInstruction: EDIT_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: EDIT_RESPONSE_SCHEMA,
        temperature: 0.1,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini trả về phản hồi rỗng");
    }

    return JSON.parse(text);
  }
}
