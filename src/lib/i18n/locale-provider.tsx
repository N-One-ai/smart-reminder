"use client";

import { createContext, useContext, useMemo } from "react";
import type { Locale } from "./config";
import { getDictionary, type Dictionary } from "./get-dictionary";

const LocaleContext = createContext<{ locale: Locale; dict: Dictionary } | null>(null);

// Takes only the (serializable) locale string, never the dictionary itself —
// the dictionary contains functions (e.g. daysToGoal(n)), and functions can't
// be passed as props from a Server Component across to a Client Component.
// Looked up client-side instead, from the same static dictionaries module.
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ locale, dict: getDictionary(locale) }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

function useLocaleContext() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale/useDictionary must be used within LocaleProvider");
  return ctx;
}

export function useLocale(): Locale {
  return useLocaleContext().locale;
}

export function useDictionary(): Dictionary {
  return useLocaleContext().dict;
}
