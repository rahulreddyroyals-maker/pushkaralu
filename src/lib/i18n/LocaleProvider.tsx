"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { TE } from "./te-map";
import { LANG_COOKIE } from "./lang-cookie";

export type SiteLang = "en" | "te";

interface Ctx { lang: SiteLang; setLang: (l: SiteLang) => void; tr: (s: string) => string }
const LocaleContext = createContext<Ctx>({ lang: "en", setLang: () => {}, tr: (s) => s });

export function LocaleProvider({ initialLang, children }: { initialLang: SiteLang; children: ReactNode }) {
  const [lang, setLangState] = useState<SiteLang>(initialLang);
  const router = useRouter();
  const setLang = useCallback((l: SiteLang) => {
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l;
    setLangState(l);
    router.refresh();
  }, [router]);
  const tr = useCallback((s: string) => (lang === "te" ? TE[s] ?? s : s), [lang]);
  const value = useMemo(() => ({ lang, setLang, tr }), [lang, setLang, tr]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);
/** Translates a string (only when it is plain text). */
export function useTr() { return useContext(LocaleContext).tr; }
