"use client";

import type { AnalyticsEventInput } from "./events";

/**
 * Browser-side analytics. Honours Do Not Track / Global Privacy Control and
 * an off switch (NEXT_PUBLIC_ANALYTICS_ENABLED=false). Sends only the small
 * whitelisted event shape; no cookies, no user id, no persistent id — just a
 * per-tab "seen already" memory (sessionStorage) so a refresh isn't counted
 * as a new unique.
 */
type Outgoing = Partial<AnalyticsEventInput> & { type: AnalyticsEventInput["type"] };

const queue: Outgoing[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

export function analyticsAllowed(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "false") return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };
  const dnt = nav.doNotTrack ?? (window as unknown as { doNotTrack?: string }).doNotTrack ?? nav.msDoNotTrack;
  return !(dnt === "1" || dnt === "yes" || nav.globalPrivacyControl === true);
}

/** True the first time `key` is seen in this tab's session. */
export function firstInSession(key: string): boolean {
  try {
    const k = `pa:${key}`;
    if (sessionStorage.getItem(k)) return false;
    sessionStorage.setItem(k, "1");
    return true;
  } catch {
    return true;
  }
}

function flush() {
  timer = null;
  if (queue.length === 0) return;
  const events = queue.splice(0, 20);
  const body = JSON.stringify({ events });
  try {
    if (navigator.sendBeacon?.("/api/analytics/event", new Blob([body], { type: "text/plain" }))) {
      if (queue.length) schedule();
      return;
    }
  } catch {
    /* fall through to fetch */
  }
  void fetch("/api/analytics/event", { method: "POST", body, keepalive: true, headers: { "content-type": "text/plain" } }).catch(() => undefined);
  if (queue.length) schedule();
}

function schedule() {
  if (!timer) timer = setTimeout(flush, 1500);
}

export function track(event: Outgoing): void {
  if (!analyticsAllowed()) return;
  queue.push({ path: window.location.pathname, first: false, ...event });
  schedule();
}

export function flushNow(): void {
  if (timer) clearTimeout(timer);
  flush();
}
