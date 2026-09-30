import type { Locale } from "./config";
import vi from "./dictionaries/vi";
import en from "./dictionaries/en";

export type Dictionary = typeof vi;

const dictionaries: Record<Locale, Dictionary> = { vi, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
