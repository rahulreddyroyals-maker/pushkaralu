import Link from "next/link";
import { SiteShell } from "@/components/layout/SiteShell";
import { Breadcrumb, Card } from "@/components/ui";
import { EmergencyKindSection } from "@/components/emergency/EmergencyKindSection";
import { loadPublicList } from "@/features/catalog/publicApi";
import { EMERGENCY_KINDS, EMERGENCY_KIND_ICONS, EMERGENCY_KIND_LABELS, type EmergencyService } from "@/features/emergency/definition";
import { ROUTES } from "@/config/app";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Emergency Help",
  description: "Verified police, ambulance, fire, hospital, pharmacy and first-aid contacts for pilgrims.",
};

/**
 * Emergency dashboard. Every number comes from the admin-managed, verified
 * directory — there are deliberately NO hardcoded fallback numbers here: a
 * number we haven't verified is worse than an empty section.
 */
export default async function EmergencyPage() {
  const results = await Promise.all(EMERGENCY_KINDS.map((kind) => loadPublicList("emergency-services", { pageSize: 24, filters: { kind } })));
  const nowMs = Date.now();

  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Home", href: ROUTES.home }, { label: "Emergency" }]} />
        <h1 className="mt-3 text-2xl font-semibold text-ink">Emergency help</h1>

        <Card padding="md" className="mt-4 border-status-critical/40 bg-[rgba(201,59,59,0.05)]">
          <p className="text-sm font-medium text-ink">In danger or a medical emergency, call emergency services first, then use this page.</p>
          <p className="mt-1 text-sm text-ink-muted">
            Contacts below are entered and verified by the Pushkaralu team, with the verification date and source shown on each. Lost someone?{" "}
            <Link href={ROUTES.lostAndFound} className="font-medium text-river-current hover:underline">
              Report in Lost &amp; Found
            </Link>{" "}
            or alert your{" "}
            <Link href="/family" className="font-medium text-river-current hover:underline">
              family group
            </Link>
            .
          </p>
        </Card>

        <nav aria-label="Jump to" className="mt-6 flex flex-wrap gap-2">
          {EMERGENCY_KINDS.map((kind) => (
            <a key={kind} href={`#emergency-${kind}`} className="rounded-full border border-border px-3 py-1.5 text-sm text-river-deep hover:bg-river-mist">
              {EMERGENCY_KIND_ICONS[kind]} {EMERGENCY_KIND_LABELS[kind]}
            </a>
          ))}
        </nav>

        <div className="mt-8 flex flex-col gap-10">
          {EMERGENCY_KINDS.map((kind, i) => (
            <EmergencyKindSection key={kind} kind={kind} items={results[i]!.items as unknown as EmergencyService[]} nowMs={nowMs} />
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
