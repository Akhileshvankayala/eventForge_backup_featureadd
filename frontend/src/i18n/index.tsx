import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { en } from "./translations/en";
import { te } from "./translations/te";
import { hi } from "./translations/hi";

export type LanguageCode = "en" | "te" | "hi";
export type TranslationKey = keyof typeof en;
export type NestedKey<T> = T extends string ? string : T;

export const SUPPORTED_LANGUAGES: { code: LanguageCode; label: string; nativeLabel: string }[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
];

export const LANGUAGE_STORAGE_KEY = "eventforge_language";

export const translations: Record<LanguageCode, typeof en> = { 
  en, 
  te: te as unknown as typeof en, 
  hi: hi as unknown as typeof en 
};

/**
 * Resolves a dot-separated key against a nested translation object.
 * e.g. t("landing.hero.title1") → "Ideas are better"
 */
function resolveNested(obj: unknown, key: string): string | undefined {
  return key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj) as string | undefined;
}

export interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, fallback?: string) => string;
  translations: typeof en;
  supportedLanguages: typeof SUPPORTED_LANGUAGES;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored && ["en", "te", "hi"].includes(stored)) {
        return stored as LanguageCode;
      }
    }
    // Default to browser language if supported, otherwise English
    const browserLang = navigator.language?.split("-")[0]?.toLowerCase();
    if (browserLang && ["en", "te", "hi"].includes(browserLang)) {
      return browserLang as LanguageCode;
    }
    return "en";
  });

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }
    // Update the html lang attribute
    const html = document.documentElement;
    const langMap: Record<LanguageCode, string> = {
      en: "en",
      te: "te",
      hi: "hi",
    };
    html.lang = langMap[language] || "en";
  }, [language]);

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
  };

  const t = useMemo(() => {
    const dict = translations[language] || en;
    return (key: string, fallback?: string): string => {
      const value = resolveNested(dict, key);
      if (value !== undefined) return String(value);
      // Try English fallback
      const enValue = resolveNested(en, key);
      if (enValue !== undefined) return String(enValue);
      return fallback ?? key;
    };
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t,
      translations: translations[language] || en,
      supportedLanguages: SUPPORTED_LANGUAGES,
    }),
    [language, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return ctx;
}
