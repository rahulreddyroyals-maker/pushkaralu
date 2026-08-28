import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

/**
 * Base premium card surface. The subtle top-border glow on hover is the
 * design system's restrained "river line" signature — used here, not
 * scattered everywhere, so it stays meaningful.
 */
export function Card({
  hoverable = false,
  padding = "md",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface-raised",
        "shadow-[var(--shadow-card)]",
        hoverable &&
          "group transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)]",
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {hoverable && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[3px] scale-x-0 bg-gradient-to-r from-river-current via-saffron to-river-current transition-transform duration-300 group-hover:scale-x-100"
        />
      )}
      {children}
    </div>
  );
}
