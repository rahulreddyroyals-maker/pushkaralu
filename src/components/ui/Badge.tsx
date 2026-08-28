import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes } from "react";

type Tone = "neutral" | "saffron" | "success" | "warning" | "danger" | "info";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  dot?: boolean;
}

const toneClasses: Record<Tone, string> = {
  neutral: "bg-black/[.05] text-ink-muted",
  saffron: "bg-saffron-light text-[#8a5410]",
  success: "bg-[rgba(47,158,91,0.12)] text-status-low",
  warning: "bg-[rgba(217,166,28,0.14)] text-[#8a6c10]",
  danger: "bg-[rgba(201,59,59,0.12)] text-status-critical",
  info: "bg-river-mist text-river-deep",
};

const dotClasses: Record<Tone, string> = {
  neutral: "bg-ink-muted",
  saffron: "bg-saffron",
  success: "bg-status-low",
  warning: "bg-status-moderate",
  danger: "bg-status-critical",
  info: "bg-river-current",
};

/** Small status label. Used for crowd status, approval status, booking state. */
export function Badge({ tone = "neutral", dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-data text-xs font-medium uppercase tracking-wide",
        toneClasses[tone],
        className
      )}
      {...props}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotClasses[tone])} aria-hidden />}
      {children}
    </span>
  );
}
