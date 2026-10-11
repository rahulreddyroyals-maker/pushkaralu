"use client";

import { useEffect, useRef, useState } from "react";
import { firstInSession, track } from "@/lib/analytics/client";
import type { ServedAd } from "@/features/ads/serve";

const SPONSORED = { en: "Sponsored", te: "ప్రాయోజితం" };
const BY = { en: "by", te: "ద్వారా" };

function AdItem({ ad, lang }: { ad: ServedAd; lang: "en" | "te" }) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.5)) {
          // Counted once per tab session per campaign, only when at least half the ad has been on screen.
          if (firstInSession(`adimp:${ad.id}`)) track({ type: "ad_impression", campaignId: ad.id, action: ad.placement, first: true });
          io.disconnect();
        }
      },
      { threshold: [0.5] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ad.id, ad.placement]);

  const label = (
    <span className="rounded bg-saffron/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
      {SPONSORED[lang]}{ad.sponsor ? ` ${BY[lang]} ${ad.sponsor}` : ""}
    </span>
  );
  // Plain <a>, not next/link: link prefetching would hit the click-counting URL without a human click.
  const common = { ref, href: ad.href, rel: "sponsored noopener", "data-ad": ad.id } as const;

  if (ad.format === "BANNER") {
    return (
      <a {...common} className="block overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface-raised">
        <div className="flex items-center justify-between px-3 py-1">{label}</div>
        {ad.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={ad.image} alt={ad.headline} loading="lazy" className="max-h-48 w-full object-cover" />}
        <p className="px-3 py-2 text-sm font-medium text-ink">{ad.headline}</p>
      </a>
    );
  }
  if (ad.format === "HOMEPAGE_PROMOTION") {
    return (
      <a {...common} className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-saffron/40 bg-surface-raised p-4 sm:flex-row sm:items-center">
        {ad.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={ad.image} alt="" loading="lazy" className="h-24 w-full rounded-lg object-cover sm:w-40" />}
        <div className="flex-1">
          {label}
          <p className="mt-1 text-lg font-semibold text-ink">{ad.headline}</p>
          {ad.body && <p className="mt-1 text-sm text-ink-muted">{ad.body}</p>}
        </div>
        {ad.cta && <span className="rounded-lg bg-river-deep px-4 py-2 text-sm font-medium text-white">{ad.cta}</span>}
      </a>
    );
  }
  // SPONSORED_LISTING / SPONSORED_ARTICLE — card styled like normal results but always labelled.
  return (
    <a {...common} className="flex gap-3 rounded-[var(--radius-card)] border border-border bg-surface-raised p-3">
      {ad.creative?.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={ad.creative.image} alt="" loading="lazy" className="h-20 w-20 rounded-lg object-cover" />}
      <div className="min-w-0">
        {label}
        <p className="mt-1 font-semibold text-ink">{ad.creative?.title ?? ad.headline}</p>
        {(ad.body || ad.creative?.subtitle) && <p className="mt-0.5 line-clamp-2 text-sm text-ink-muted">{ad.body || ad.creative?.subtitle}</p>}
        {ad.cta && <p className="mt-1 text-xs text-river-deep">{ad.cta} →</p>}
      </div>
    </a>
  );
}

/** Renders the ads for a placement. Renders nothing when there are none, and never blocks or breaks the page if the ad request fails. */
export function AdSlot({ placement, lang = "en", className }: { placement: string; lang?: "en" | "te"; className?: string }) {
  const [ads, setAds] = useState<ServedAd[]>([]);
  useEffect(() => {
    let live = true;
    fetch(`/api/ads/serve?placement=${encodeURIComponent(placement)}&lang=${lang}`)
      .then((r) => (r.ok ? r.json() : { ads: [] }))
      .then((d: { ads?: ServedAd[] }) => live && setAds(d.ads ?? []))
      .catch(() => undefined);
    return () => { live = false; };
  }, [placement, lang]);
  if (ads.length === 0) return null;
  return (
    <aside aria-label={SPONSORED[lang]} className={className}>
      <div className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]">
        {ads.map((ad) => <AdItem key={ad.id} ad={ad} lang={lang} />)}
      </div>
    </aside>
  );
}
