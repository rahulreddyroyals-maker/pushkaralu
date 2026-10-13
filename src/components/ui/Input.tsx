"use client";

import { cn } from "@/lib/utils/cn";
import { useTr } from "@/lib/i18n/LocaleProvider";
import { useId, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, id, className, ...props }: InputProps) {
  const tr = useTr();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {tr(label)}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "h-11 rounded-lg border border-border bg-surface-raised px-3.5 text-sm text-ink placeholder:text-ink-muted",
          "transition-colors focus:border-river-current focus:outline-none focus:ring-2 focus:ring-river-current/20",
          error && "border-status-critical focus:border-status-critical focus:ring-status-critical/20",
          className
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
        placeholder={props.placeholder ? tr(props.placeholder) : undefined}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-status-critical">
          {tr(error)}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="text-xs text-ink-muted">
          {tr(hint)}
        </p>
      )}
    </div>
  );
}
