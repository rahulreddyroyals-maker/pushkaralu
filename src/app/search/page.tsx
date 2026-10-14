import Link from "next/link";
import { SiteShell } from "@/components/layout/SiteShell";
import { Breadcrumb, EmptyState, SearchBar } from "@/components/ui";
import { Tr } from "@/components/i18n/Tr";
import { listHotels } from "@/features/hotels/api";
import { listTemples } from "@/features/temples/api";
import { listPurohits } from "@/features/purohits/api";
import { listBusinesses } from "@/features/businesses/api";
import { ROUTES } from "@/config/app";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search", robots: { index: false, follow: true } };

interface Hit {
  href: string;
  title: string;
  kind: string;
  blurb?: string;
}

async function safe<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch {
    return null;
  }
}

const TOPIC_LINKS: { match: RegExp; label: string; href: string }[] = [
  { match: /temple|alayam|devalay/i, label: "Temples", href: ROUTES.temples },
  { match: /hotel|stay|lodge/i, label: "Hotels", href: ROUTES.hotels },
  { match: /purohit|priest|pandit/i, label: "Purohits", href: ROUTES.purohits },
  { match: /ghat|snan|bath/i, label: "Ghats", href: ROUTES.ghats },
  { match: /event|date|calendar|pushkar/i, label: "Events", href: ROUTES.events },
  { match: /emergency|help|police|medical/i, label: "Emergency help", href: ROUTES.emergency },
  { match: /park/i, label: "Parking", href: ROUTES.parking },
  { match: /lost|found/i, label: "Lost & Found", href: ROUTES.lostAndFound },
  { match: /ritual|puja|pooja/i, label: "Rituals", href: ROUTES.rituals },
  { match: /taxi|travel|bus|train/i, label: "Travel & Taxis", href: ROUTES.travel },
  { match: /boat/i, label: "Boats", href: ROUTES.boats },
  { match: /food|restaurant|eat/i, label: "Restaurants", href: ROUTES.restaurants },
  { match: /ai|assistant|ask/i, label: "AI Assistant", href: ROUTES.assistant },
];

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const term = q.trim().slice(0, 80);
  const hits: Hit[] = [];
  const topics = term ? TOPIC_LINKS.filter((t) => t.match.test(term)) : [];

  if (term) {
    const words = term.toLowerCase().split(/\s+/).filter(Boolean).map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w));
    const matches = (...fields: (string | undefined)[]) => {
      const hay = fields.filter(Boolean).join(" ").toLowerCase();
      return words.every((w) => hay.includes(w));
    };
    // Browse a bounded set and filter in memory so matches work anywhere in the name,
    // description or address (Firestore has no "contains" query).
    const [hotels, temples, purohits, businesses] = await Promise.all([
      safe(listHotels({ pageSize: 100 })),
      safe(listTemples({ pageSize: 100 })),
      safe(listPurohits({ pageSize: 100 })),
      safe(listBusinesses({ pageSize: 100 })),
    ]);
    const isKind = (kind: string) => words.some((w) => kind.toLowerCase().startsWith(w) || w.startsWith(kind.toLowerCase()));
    const only = (kind: string, textMatch: boolean) => textMatch || isKind(kind);
    hotels?.items.forEach((h) => only("Hotel", matches(h.name.en, h.name.te, h.description?.en, h.address)) && hits.push({ href: `/hotels/${h.id}`, title: h.name.en, kind: "Hotel", blurb: h.address }));
    temples?.items.forEach((t) => only("Temple", matches(t.name.en, t.name.te, t.description?.en, t.address)) && hits.push({ href: `/temples/${t.id}`, title: t.name.en, kind: "Temple", blurb: t.address }));
    purohits?.items.forEach((p) => only("Purohit", matches(p.name.en, p.name.te)) && hits.push({ href: `/purohits/${p.id}`, title: p.name.en, kind: "Purohit" }));
    businesses?.items.forEach((b) => matches(b.name.en, b.name.te) && hits.push({ href: `/businesses/${b.id}`, title: b.name.en, kind: "Business" }));
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Home", href: ROUTES.home }, { label: "Search" }]} />
        <h1 className="mt-3 text-2xl font-semibold text-ink"><Tr>Search</Tr></h1>
        <div className="mt-4">
          <SearchBar defaultValue={term} size="sm" />
        </div>

        {!term ? (
          <p className="mt-8 text-ink-muted"><Tr>Type a name to search hotels, temples, purohits and local businesses.</Tr></p>
        ) : (
          <>
            {topics.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {topics.map((t) => (
                  <Link key={t.href} href={t.href} className="rounded-full border border-saffron/50 bg-saffron-light px-4 py-2 text-sm font-medium text-river-deep hover:bg-saffron/20">
                    <Tr>{t.label}</Tr> →
                  </Link>
                ))}
              </div>
            )}
            {hits.length === 0 ? (
              <div className="mt-8">
                <EmptyState title={`No results for “${term}”`} description="Try a different spelling or the start of a name. Names are matched from the beginning." />
              </div>
            ) : (
              <ul className="mt-6 flex flex-col gap-3">
                {hits.map((h) => (
                  <li key={h.kind + h.href}>
                    <Link href={h.href} className="block rounded-[var(--radius-card)] border border-border bg-surface-raised p-4 shadow-[var(--shadow-card)] hover:border-saffron">
                      <span className="font-data text-xs uppercase tracking-wide text-ember"><Tr>{h.kind}</Tr></span>
                      <span className="block font-medium text-river-deep">{h.title}</span>
                      {h.blurb ? <span className="block text-sm text-ink-muted">{h.blurb}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </SiteShell>
  );
}
