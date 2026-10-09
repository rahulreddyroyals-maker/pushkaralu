"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { Button } from "@/components/ui";
import { api } from "@/lib/clientApi";
import { currentPushState, disablePush, enablePush, type PushState } from "@/lib/firebase/messaging";
import { CATEGORY_HINTS, CATEGORY_LABELS, NOTIFICATION_CATEGORIES, type NotificationCategory, type PrefsView } from "@/features/notifications/types";

export function PreferencesClient({ initial }: { initial: PrefsView }) {
  const [prefs, setPrefs] = useState(initial);
  const [push, setPush] = useState<PushState>("off");
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void currentPushState().then(setPush);
  }, []);

  async function change(category: NotificationCategory, patch: { inApp?: boolean; push?: boolean }) {
    setMsg(null);
    const res = await api<PrefsView>("/api/notifications/preferences", "PUT", { categories: { [category]: patch } });
    if (!res.ok) return setMsg({ kind: "error", text: res.error });
    setPrefs(res.data);
  }

  async function togglePush() {
    setBusy(true);
    setMsg(null);
    if (push === "on") {
      await disablePush();
      setPush("off");
    } else {
      const res = await enablePush();
      if (!res.ok) setMsg({ kind: "error", text: res.error });
      setPush(await currentPushState());
    }
    const fresh = await api<PrefsView>("/api/notifications/preferences", "GET");
    if (fresh.ok) setPrefs(fresh.data);
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-6">
      {msg && <p role={msg.kind === "error" ? "alert" : "status"} className={`rounded-lg px-4 py-3 text-sm ${msg.kind === "error" ? "bg-red-50 text-status-critical" : "bg-green-50 text-green-800"}`}>{msg.text}</p>}

      <Card padding="md">
        <h2 className="text-lg font-semibold text-ink">Push notifications on this device</h2>
        {push === "unsupported" && <p className="mt-1 text-sm text-ink-muted">This browser doesn&apos;t support push notifications. You&apos;ll still see everything in your inbox.</p>}
        {push === "denied" && <p className="mt-1 text-sm text-ink-muted">Notifications are blocked for this site. Allow them in your browser&apos;s site settings, then come back.</p>}
        {(push === "on" || push === "off") && (
          <>
            <p className="mt-1 text-sm text-ink-muted">
              {push === "on" ? "Push is on for this device." : "Off. Turning it on asks your browser for permission."} Devices registered on your account: {prefs.devices}.
            </p>
            <Button className="mt-3" size="sm" variant={push === "on" ? "outline" : "primary"} disabled={busy} onClick={togglePush}>
              {push === "on" ? "Turn off on this device" : "Turn on push notifications"}
            </Button>
          </>
        )}
      </Card>

      <Card padding="md">
        <h2 className="text-lg font-semibold text-ink">What you want to hear about</h2>
        <ul className="mt-3 divide-y divide-border">
          {NOTIFICATION_CATEGORIES.map((c) => {
            const pref = prefs.categories[c];
            const locked = prefs.locked.inApp.includes(c);
            return (
              <li key={c} className="py-3">
                <p className="font-medium text-ink">{CATEGORY_LABELS[c]}</p>
                <p className="text-xs text-ink-muted">{CATEGORY_HINTS[c]}</p>
                <div className="mt-2 flex flex-wrap gap-5 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={pref.inApp} disabled={locked} onChange={(e) => change(c, { inApp: e.target.checked })} />
                    In my inbox{locked ? " (always on)" : ""}
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={pref.push} disabled={!pref.inApp} onChange={(e) => change(c, { push: e.target.checked })} />
                    Push notification
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-ink-muted">
          Crowd alerts and event reminders only reach you for ghats and events you follow (use the &ldquo;alerts&rdquo; button on a ghat or event page). You follow {prefs.followedGhatIds.length} ghat(s) and {prefs.followedEventIds.length} event(s).
        </p>
      </Card>
    </div>
  );
}
