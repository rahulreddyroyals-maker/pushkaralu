"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { api } from "@/lib/clientApi";
import type { PrefsView } from "@/features/notifications/types";

/** Follow/unfollow an event or ghat so its reminders and crowd alerts reach you. Reads and writes only the caller's own preferences. */
export function FollowButton({ kind, id, label }: { kind: "event" | "ghat"; id: string; label: string }) {
  const [state, setState] = useState<"loading" | "signedOut" | "following" | "notFollowing">("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void api<PrefsView>("/api/notifications/preferences", "GET").then((res) => {
      if (!alive) return;
      if (!res.ok) return setState(res.status === 401 ? "signedOut" : "notFollowing");
      const list = kind === "event" ? res.data.followedEventIds : res.data.followedGhatIds;
      setState(list.includes(id) ? "following" : "notFollowing");
    });
    return () => {
      alive = false;
    };
  }, [kind, id]);

  if (state === "loading") return <div className="h-9" aria-hidden />;
  if (state === "signedOut") {
    return (
      <Link href={`/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`} className="text-sm font-medium text-river-deep underline">
        Sign in to get alerts
      </Link>
    );
  }

  async function toggle() {
    setBusy(true);
    setError(null);
    const res = await api<PrefsView>("/api/notifications/follow", "POST", { kind, id, value: state !== "following" });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    const list = kind === "event" ? res.data.followedEventIds : res.data.followedGhatIds;
    setState(list.includes(id) ? "following" : "notFollowing");
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button size="sm" variant={state === "following" ? "outline" : "primary"} disabled={busy} onClick={toggle} aria-pressed={state === "following"}>
        {state === "following" ? "Following — stop alerts" : label}
      </Button>
      {error && <p role="alert" className="text-xs text-status-critical">{error}</p>}
    </div>
  );
}
