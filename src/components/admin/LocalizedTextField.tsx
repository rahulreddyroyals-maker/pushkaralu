"use client";

import { cn } from "@/lib/utils/cn";
import type { LocalizedText } from "@/types/domain";

interface LocalizedTextFieldProps {
  label: string;
  value: LocalizedText;
  onChange: (value: LocalizedText) => void;
  multiline?: boolean;
  error?: string;
}

/**
 * Every content field in this platform is bilingual (spec §9 — never
 * hardcode user-facing strings, support Telugu SEO). Rather than repeat
 * an English+Telugu input pair in every admin form, this is the one
 * place that pairing is implemented.
 */
export function LocalizedTextField({ label, value, onChange, multiline = false, error }: LocalizedTextFieldProps) {
  const fieldClass = cn(
    "w-full rounded-lg border border-border bg-surface-raised px-3.5 text-sm text-ink placeholder:text-ink-muted",
    "focus:border-river-current focus:outline-none focus:ring-2 focus:ring-river-current/20",
    multiline ? "min-h-24 py-2.5" : "h-11"
  );

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-ink-muted">English</label>
          {multiline ? (
            <textarea className={fieldClass} value={value.en} onChange={(e) => onChange({ ...value, en: e.target.value })} />
          ) : (
            <input className={fieldClass} value={value.en} onChange={(e) => onChange({ ...value, en: e.target.value })} />
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-muted">తెలుగు (Telugu)</label>
          {multiline ? (
            <textarea className={fieldClass} value={value.te} onChange={(e) => onChange({ ...value, te: e.target.value })} />
          ) : (
            <input className={fieldClass} value={value.te} onChange={(e) => onChange({ ...value, te: e.target.value })} />
          )}
        </div>
      </div>
      {error && <p className="text-xs text-status-critical">{error}</p>}
    </div>
  );
}
