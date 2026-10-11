import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteShell } from "@/components/layout/SiteShell";
import { Breadcrumb, EmptyState } from "@/components/ui";
import { listEvents } from "@/features/events/api";
import { ROUTES } from "@/config/app";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ghats",
  description: "Bathing ghats with facilities, parking and the latest staff-reported crowd status.",
};

/**
 * Ghats belong to an event (/events/[id]/ghats). This entry point, linked from
 * the main menu, goes straight to the ghats when exactly one event is published
 * and otherwise asks which event the pilgrim means.
 */
export default async function GhatsIndexPage() {
  const { items } = await listEvents({ pageSize: 24 });
  if (items.length === 1) redirect(`/events/${items[0]!.id}/ghats`);

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Home", href: ROUTES.home }, { label: "Ghats" }]} />
        <h1 className="mt-3 text-2xl font-semibold text-ink">Ghats</h1>
        <p className="mt-1 text-ink-muted">Choose an event to see its ghats, facilities and the latest crowd update.</p>
        {items.length === 0 ? (
          <div className="mt-8">
            <EmptyState title="No events published yet" description="Ghats will appear here once an event is published." />
          </div>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {items.map((e) => (
              <li key={e.id}>
                <Link href={`/events/${e.id}/ghats`} className="block rounded-[var(--radius-card)] border border-border bg-surface-raised p-4 font-medium text-river-deep hover:bg-river-mist">
                  {e.name.en}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SiteShell>
  );
}
