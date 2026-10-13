"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { TE } from "./te-map";
import { LANG_COOKIE } from "./lang-cookie";

export type SiteLang = "en" | "te";

interface Ctx { lang: SiteLang; setLang: (l: SiteLang) => void; tr: (s: string) => string }
const LocaleContext = createContext<Ctx>({ lang: "en", setLang: () => {}, tr: (s) => s });

/**
 * The server always renders English so pages stay statically cacheable (ISR/CDN) and crawlers get one
 * canonical version (Telugu has its own /te routes). The visitor's saved choice is applied right after hydration.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<SiteLang>("en");
  useEffect(() => {
    if (document.cookie.split("; ").some((c) => c === `${LANG_COOKIE}=te`)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLangState("te");
      document.documentElement.lang = "te";
    }
  }, []);
  const setLang = useCallback((l: SiteLang) => {
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l;
    setLangState(l);
  }, []);
  const tr = useCallback((s: string) => (lang === "te" ? TE[s] ?? s : s), [lang]);
  const value = useMemo(() => ({ lang, setLang, tr }), [lang, setLang, tr]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);
/** Translates a string (only when it is plain text). */
export function useTr() { return useContext(LocaleContext).tr; }
