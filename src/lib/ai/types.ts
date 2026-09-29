import type { AIParseInput, AIEditInput, AIImageParseInput } from "@/types/ai";

/**
 * Any AI provider adapter must implement this. Swapping Gemini for OpenAI or
 * Claude later means adding a new file under lib/ai/providers/ and pointing
 * the factory in lib/ai/provider.ts at it — no call-site changes.
 */
export interface AIProvider {
  /** Returns the raw parsed JSON (unknown) — validation happens separately, see lib/ai/validate.ts. */
  parseReminder(input: AIParseInput): Promise<unknown>;
  /** Natural-language editing (V2) — applies an edit instruction to an existing reminder. */
  parseEdit(input: AIEditInput): Promise<unknown>;
  /** Scan ảnh (V2) — image understanding, same output shape as parseReminder. */
  parseImage(input: AIImageParseInput): Promise<unknown>;
}
