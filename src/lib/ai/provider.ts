import type { AIProvider } from "./types";
import { GeminiProvider } from "./providers/gemini";

/**
 * Selects the AI provider by env var — swap AI_PROVIDER + add a new adapter
 * under providers/ to switch to OpenAI or Claude later, no call-site changes.
 * MVP default: Gemini (see prd-smart-reminder.md decision log).
 */
export function getAIProvider(): AIProvider {
  const providerName = process.env.AI_PROVIDER ?? "gemini";

  switch (providerName) {
    case "gemini": {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY chưa được cấu hình trong .env.local");
      }
      return new GeminiProvider(apiKey);
    }
    default:
      throw new Error(`AI provider không được hỗ trợ: ${providerName}`);
  }
}
