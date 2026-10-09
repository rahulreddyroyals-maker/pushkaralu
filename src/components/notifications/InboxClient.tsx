"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { api } from "@/lib/clientApi";
import { CATEGORY_LABELS, type InboxItem } from "@/features/notifications/types";

const TONE = { LOW: "neutral", NORMAL: "info", HIGH: "warning", URGENT: "danger" } as const;

function ago(iso: string) {
  const m = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function InboxClient({ initial, nextCursor: initialCursor }: { initial: InboxItem[]; nextCursor: string | null }) {
  const [items, setItems] = useState(initial);
  const [cursor, setCursor] = useState(initialCursor);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unread = items.filter((i) => !i.read).length;

  async function loadMore() {
    if (!cursor) return;
    setBusy(true);
    const res = await api<{ items: InboxItem[]; nextCursor: string | null }>(`/api/notifications?cursor=${encodeURIComponent(cursor)}`, "GET");
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setItems((prev) => [...prev, ...res.data.items]);
    setCursor(res.data.nextCursor);
  }

  async function read(ids: string[]) {
    setItems((prev) => prev.map((i) => (ids.includes(i.id) ? { ...i, read: true } : i)));
    await api("/api/notifications/read", "POST", { ids });
  }
  async function readAll() {
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    const res = await api("/api/notifications/read", "POST", { all: true });
    if (!res.ok) setError(res.error);
  }

  if (items.length === 0) return <EmptyState title="No notifications yet" description="Booking updates, reminders for events you follow and safety alerts will appear here." />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">{unread ? `${unread} unread` : "All caught up"}</p>
        {unread > 0 && (
          <Button size="sm" variant="ghost" onClick={readAll}>
            Mark all as read
          </Button>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-status-critical">{error}</p>}
      {items.map((n) => (
        <Card key={n.id} padding="md" className={n.read ? "" : "border-river-current bg-river-mist/40"}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-ink">{n.title}</p>
                {(n.priority === "HIGH" || n.priority === "URGENT") && <Badge tone={TONE[n.priority]}>{n.priority === "URGENT" ? "Urgent" : "Important"}</Badge>}
              </div>
              <p className="mt-1 text-sm text-ink">{n.message}</p>
              <p className="mt-1 text-xs text-ink-muted">
                {CATEGORY_LABELS[n.category]} · {ago(n.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {n.link && n.link !== "/notifications" && (
                <Link href={n.link} onClick={() => !n.read && void read([n.id])} className="text-sm font-medium text-river-deep underline">
                  View
                </Link>
              )}
              {!n.read && (
                <Button size="sm" variant="ghost" onClick={() => read([n.id])}>
                  Mark read
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
      {cursor && (
        <div className="flex justify-center">
          <Button variant="outline" disabled={busy} onClick={loadMore}>
            {busy ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
