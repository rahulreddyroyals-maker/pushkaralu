"use client";

interface AdminTopNavProps {
  onOpenMobileSidebar: () => void;
}

export function AdminTopNav({ onOpenMobileSidebar }: AdminTopNavProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface-raised px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Open admin menu"
          className="flex h-9 w-9 items-center justify-center rounded-md text-ink lg:hidden"
        >
          <span className="text-lg">☰</span>
        </button>
        <div className="hidden sm:block">
          <input
            type="search"
            placeholder="Search users, bookings, listings..."
            className="h-9 w-72 rounded-md border border-border bg-surface px-3 text-sm text-ink placeholder:text-ink-muted focus:border-river-current focus:outline-none focus:ring-2 focus:ring-river-current/20"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span aria-hidden className="text-lg">
          🔔
        </span>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-river-mist font-data text-sm font-semibold text-river-deep">
          A
        </div>
      </div>
    </header>
  );
}
