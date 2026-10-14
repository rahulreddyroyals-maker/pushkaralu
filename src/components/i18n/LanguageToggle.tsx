"use client";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLocale();
  return (
    <div role="group" aria-label="Language" className={`inline-flex shrink-0 overflow-hidden whitespace-nowrap rounded-full border border-gold/60 text-sm ${className}`}>
      {(["en", "te"] as const).map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} className={`px-3 py-1 text-xs font-medium ${lang === l ? "bg-river-deep text-white" : "text-ink hover:bg-river-mist"}`}>
          {l === "en" ? "EN" : "తెలుగు"}
        </button>
      ))}
    </div>
  );
}
