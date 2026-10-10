"use client";

import { useState } from "react";
import { shareTargets } from "@/lib/seo/share";

interface ShareButtonsProps {
  title: string;
  /** Canonical site path of the page being shared. */
  path: string;
  /** Absolute origin (passed from the server so SSR and client agree). */
  siteUrl: string;
  labels?: { share: string; whatsapp: string; facebook: string; copy: string; copied: string };
}

const EN = { share: "Share", whatsapp: "WhatsApp", facebook: "Facebook", copy: "Copy link", copied: "Link copied" };

export function ShareButtons({ title, path, siteUrl, labels = EN }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const { url, whatsapp, facebook } = shareTargets(title, path, siteUrl);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(labels.copy, url); // clipboard blocked (insecure context / permissions) — let the person copy manually
    }
  }

  const btn = "inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-sm text-ink hover:bg-river-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-river-deep";
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={labels.share}>
      <span className="text-sm text-ink-muted">{labels.share}:</span>
      <a className={btn} href={whatsapp} target="_blank" rel="noopener noreferrer">{labels.whatsapp}</a>
      <a className={btn} href={facebook} target="_blank" rel="noopener noreferrer">{labels.facebook}</a>
      <button type="button" className={btn} onClick={copy}>{copied ? labels.copied : labels.copy}</button>
      <span role="status" aria-live="polite" className="sr-only">{copied ? labels.copied : ""}</span>
    </div>
  );
}
