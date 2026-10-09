"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/clientApi";
import { ROUTES } from "@/config/app";

const POLL_MS = 60_000;

/** Unread count for the signed-in user. Polls only while the tab is visible; renders nothing if the call fails (e.g. signed out). */
export function NotificationBell({ onNavigate }: { onNavigate?: () => void }) {
  const [unread, setUnread] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (document.visibilityState !== "visible") return;
      const res = await api<{ unread: number }>("/api/notifications/unread-count", "GET");
      if (alive && res.ok) setUnread(res.data.unread);
    }
    void load();
    const id = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <Link href={ROUTES.notifications} onClick={onNavigate} aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} className="relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-river-mist">
      <span aria-hidden>🔔</span>
      {unread ? (
        <span className="absolute -right-0.5 -top-0.5 min-w-[1.1rem] rounded-full bg-status-critical px-1 text-center text-[10px] font-semibold leading-[1.1rem] text-white">{unread > 99 ? "99+" : unread}</span>
      ) : null}
    </Link>
  );
}
