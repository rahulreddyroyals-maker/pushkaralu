import Link from "next/link";
import { SiteShell } from "@/components/layout/SiteShell";
import { listRituals } from "@/features/rituals/api";
import { Breadcrumb, Card, EmptyState } from "@/components/ui";
import { ROUTES } from "@/config/app";

export const dynamic = "force-dynamic";

export default async function RitualsPage() {
  const { items } = await listRituals({ pageSize: 50 });

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Home", href: ROUTES.home }, { label: "Rituals" }]} />
        <h1 className="mt-3 text-2xl font-semibold text-ink">Rituals</h1>
        <p className="mt-1 text-ink-muted">Duration, indicative pricing, and purohits who offer each ritual.</p>

        {items.length === 0 && (
          <div className="mt-8">
            <EmptyState title="No rituals published yet" description="Check back soon." />
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((ritual) => (
              <Link key={ritual.id} href={`/rituals/${ritual.id}`}>
                <Card hoverable padding="md" className="flex h-full flex-col gap-2">
                  <p className="font-semibold text-ink">{ritual.name.en}</p>
                  <p className="text-sm text-ink-muted">{ritual.description.en}</p>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="font-data text-xs text-ink-muted">{ritual.typicalDurationMinutes} min</span>
                    <span className="font-data text-sm font-medium text-river-deep">
                      ₹{ritual.indicativePriceMin}–₹{ritual.indicativePriceMax}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
