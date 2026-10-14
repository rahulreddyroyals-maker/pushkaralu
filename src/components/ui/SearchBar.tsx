"use client";

import { cn } from "@/lib/utils/cn";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTr } from "@/lib/i18n/LocaleProvider";
import { track } from "@/lib/analytics/client";

interface SearchBarProps {
  placeholder?: string;
  defaultValue?: string;
  onSearch?: (query: string) => void;
  className?: string;
  size?: "sm" | "lg";
}

/** Navigates to /search?q=… unless an `onSearch` handler overrides it. */
export function SearchBar({
  placeholder = "Search ghats, temples, hotels, purohits...",
  defaultValue = "",
  onSearch,
  className,
  size = "lg",
}: SearchBarProps) {
  const tr = useTr();
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (value.trim()) track({ type: "search", term: value.trim() });
    if (onSearch) onSearch(value.trim());
    else router.push(`/search?q=${encodeURIComponent(value.trim())}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={cn(
        "flex items-center gap-2 rounded-full border border-border bg-surface-raised shadow-[var(--shadow-card)]",
        "focus-within:border-river-current focus-within:ring-2 focus-within:ring-river-current/20",
        size === "lg" ? "h-14 px-5" : "h-11 px-4",
        className
      )}
    >
      <span aria-hidden className="text-ink-muted">
        ⌕
      </span>
      <input
        type="search"
        aria-label={tr("Search")}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={tr(placeholder)}
        className={cn(
          "flex-1 bg-transparent text-ink placeholder:text-ink-muted focus:outline-none",
          size === "lg" ? "text-base" : "text-sm"
        )}
      />
      <button
        type="submit"
        className="rounded-full bg-saffron px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ember"
      >
        {tr("Search")}
      </button>
    </form>
  );
}
