"use client";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLocale();
  return (
    <div role="group" aria-label="Language" className={`inline-flex shrink-0 overflow-hidden whitespace-nowrap rounded-lg border border-border text-sm ${className}`}>
      {(["en", "te"] as const).map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} className={`px-2 py-1 text-xs ${lang === l ? "bg-river-deep text-white" : "text-ink hover:bg-river-mist"}`}>
          {l === "en" ? "EN" : "తెలుగు"}
        </button>
      ))}
    </div>
  );
}
