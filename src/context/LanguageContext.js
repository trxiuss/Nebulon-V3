"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { translate, translateStoredMessage } from "@/lib/i18n";

const LanguageContext = createContext(null);

function normalize(value) {
  const locale = String(value || "").toLowerCase();
  if (locale.startsWith("tr")) return "tr";
  if (locale.startsWith("en")) return "en";
  return null;
}

export function LanguageProvider({ children, initialLocale = "en" }) {
  const [locale, setLocaleState] = useState(normalize(initialLocale) || "en");

  useEffect(() => {
    setLocaleState(normalize(initialLocale) || "en");
  }, [initialLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next) => {
    const normalized = normalize(next);
    if (!normalized) return;
    setLocaleState(normalized);
    document.cookie = `nebulon-locale=${normalized}; path=/; max-age=31536000; samesite=lax`;
    try {
      window.localStorage.setItem("nebulon-lang", normalized);
    } catch (err) {}
  }, []);

  const t = useCallback((key) => translate(locale, key), [locale]);
  const localizeMessage = useCallback((message) => translateStoredMessage(locale, message), [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, t, localizeMessage }),
    [locale, setLocale, t, localizeMessage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
