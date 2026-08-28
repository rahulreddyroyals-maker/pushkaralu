import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";
import { Button } from "./Button";

interface StateShellProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

function StateShell({ icon, title, description, action, className }: StateShellProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-border px-6 py-14 text-center",
        className
      )}
    >
      {icon && <div className="text-3xl">{icon}</div>}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && (
        <Button size="sm" variant="outline" onClick={action.onClick} className="mt-1">
          {action.label}
        </Button>
      )}
    </div>
  );
}

/** Nothing to show yet — frames it as an invitation to act, per design guidelines. */
export function EmptyState(props: Omit<StateShellProps, "icon"> & { icon?: ReactNode }) {
  return <StateShell icon={props.icon ?? "🗺️"} {...props} />;
}

/** Something failed — states what happened and how to recover, no apology tone. */
export function ErrorState({
  title = "This couldn't load",
  description = "Check your connection and try again.",
  action,
  className,
}: Partial<StateShellProps>) {
  return (
    <StateShell
      icon="⚠️"
      title={title}
      description={description}
      action={action}
      className={cn("border-status-critical/30", className)}
    />
  );
}

/** Skeleton loading block — use instead of a spinner for content-shaped areas. */
export function LoadingState({
  rows = 3,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-[var(--radius-card)] bg-gradient-to-r from-black/[.04] via-black/[.07] to-black/[.04] bg-[length:200%_100%]"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}
