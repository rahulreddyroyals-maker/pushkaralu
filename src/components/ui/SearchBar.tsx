"use client";

import { cn } from "@/lib/utils/cn";
import { useState, type FormEvent } from "react";

interface SearchBarProps {
  placeholder?: string;
  defaultValue?: string;
  onSearch?: (query: string) => void;
  className?: string;
  size?: "sm" | "lg";
}

/**
 * Presentational search shell only — wired to real search (Module 17)
 * in a later sprint. `onSearch` is optional so it renders standalone here.
 */
export function SearchBar({
  placeholder = "Search ghats, temples, hotels, purohits...",
  defaultValue = "",
  onSearch,
  className,
  size = "lg",
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSearch?.(value.trim());
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
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "flex-1 bg-transparent text-ink placeholder:text-ink-muted focus:outline-none",
          size === "lg" ? "text-base" : "text-sm"
        )}
      />
      <button
        type="submit"
        className="rounded-full bg-saffron px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#d6870f]"
      >
        Search
      </button>
    </form>
  );
}
