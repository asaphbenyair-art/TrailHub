"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { NextIntlClientProvider } from "next-intl";
import { useSession } from "next-auth/react";
import he from "../../messages/he.json";
import en from "../../messages/en.json";

export type Locale = "he" | "en";
const MESSAGES: Record<Locale, Record<string, unknown>> = { he, en };
const STORE_KEY = "trailhub-lang";

interface Ctx { locale: Locale; setLocale: (l: Locale) => void; }
const LangCtx = createContext<Ctx>({ locale: "he", setLocale: () => {} });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [locale, setLocaleState] = useState<Locale>("he");

  // Load: localStorage first (instant), then the saved profile preference.
  useEffect(() => {
    try {
      const s = localStorage.getItem(STORE_KEY);
      if (s === "he" || s === "en") { setLocaleState(s); return; }
    } catch {}
    if (status === "authenticated") {
      fetch("/api/profile").then((r) => (r.ok ? r.json() : null))
        .then((p) => { if (p?.language === "en" || p?.language === "he") setLocaleState(p.language); })
        .catch(() => {});
    }
  }, [status]);

  // Reflect the locale on <html> — direction + lang — so RTL/LTR switch instantly.
  useEffect(() => {
    const el = document.documentElement;
    el.lang = locale;
    el.dir = locale === "he" ? "rtl" : "ltr";
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem(STORE_KEY, l); } catch {}
    fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: l }) }).catch(() => {});
  }, []);

  return (
    <LangCtx.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone="Asia/Jerusalem">
        {children}
      </NextIntlClientProvider>
    </LangCtx.Provider>
  );
}

export function useLocale() { return useContext(LangCtx); }
