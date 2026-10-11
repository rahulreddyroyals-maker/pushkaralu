"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { firstInSession, flushNow, track } from "@/lib/analytics/client";
import { isTrackablePath, normalizePath } from "@/lib/analytics/events";

/**
 * Mounted once in the root layout. Emits: page views (+ detail-page entity
 * views, resolved on the server from the path), one app_open per session,
 * call/directions/other clicks via delegation, and "inquiry started" when a
 * form marked data-track-start="inquiry" gets focus. Private areas are skipped.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isTrackablePath(pathname)) return;
    if (firstInSession("app_open")) {
      const standalone = window.matchMedia?.("(display-mode: standalone)").matches;
      track({ type: "app_open", action: standalone ? "standalone" : "browser", first: true });
    }
    const first = firstInSession(`pv:${normalizePath(pathname)}`);
    // The page title settles just after navigation; read it on the next tick for the label.
    const t = setTimeout(() => track({ type: "page_view", path: pathname, label: document.title, first }), 250);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const path = window.location.pathname;
      if (!isTrackablePath(path)) return;
      const el = (e.target as Element | null)?.closest?.("a,button,[data-track]") as HTMLElement | null;
      if (!el) return;
      const explicit = el.getAttribute("data-track");
      const href = el instanceof HTMLAnchorElement ? el.getAttribute("href") ?? "" : "";
      let action: string | null = explicit;
      if (!action && href.startsWith("tel:")) action = "call";
      if (!action && /google\.[a-z.]+\/maps|maps\.google|maps\.app\.goo\.gl/i.test(href)) action = "directions";
      if (!action && el instanceof HTMLAnchorElement && /^https?:\/\//i.test(href) && !href.includes(window.location.host) && !el.hasAttribute("data-ad")) action = "website";
      if (action) track({ type: "click", action, path, label: document.title });
    }
    function onFocus(e: FocusEvent) {
      const form = (e.target as Element | null)?.closest?.('[data-track-start="inquiry"]');
      if (form && isTrackablePath(window.location.pathname) && firstInSession(`inq:${window.location.pathname}`)) {
        track({ type: "inquiry_start", path: window.location.pathname, label: document.title, first: true });
      }
    }
    const onHide = () => flushNow();
    document.addEventListener("click", onClick, true);
    document.addEventListener("focusin", onFocus, true);
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flushNow());
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("focusin", onFocus, true);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  return null;
}
