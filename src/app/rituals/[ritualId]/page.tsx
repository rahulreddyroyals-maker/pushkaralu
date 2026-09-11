import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/layout/SiteShell";
import { getRitual } from "@/features/rituals/api";
import { listPurohitsByRitual } from "@/features/purohits/api";
import { Breadcrumb, Card, LocationCard } from "@/components/ui";
import { ROUTES } from "@/config/app";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ ritualId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ritualId } = await params;
  const ritual = await getRitual(ritualId);
  if (!ritual) return {};
  return { title: ritual.seo?.title?.en ?? ritual.name.en, description: ritual.seo?.description?.en ?? ritual.description.en };
}

export default async function RitualDetailPage({ params }: PageProps) {
  const { ritualId } = await params;
  const ritual = await getRitual(ritualId);
  if (!ritual) notFound();

  const purohits = await listPurohitsByRitual(ritualId);

  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Home", href: ROUTES.home }, { label: "Rituals", href: "/rituals" }, { label: ritual.name.en }]} />

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink">{ritual.name.en}</h1>
        <p className="mt-4 text-ink-muted">{ritual.description.en}</p>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Card padding="md">
            <h2 className="font-semibold text-ink">Expected duration</h2>
            <p className="mt-2 font-data text-sm text-ink-muted">{ritual.typicalDurationMinutes} minutes</p>
          </Card>
          <Card padding="md">
            <h2 className="font-semibold text-ink">Indicative pricing</h2>
            <p className="mt-2 font-data text-sm text-ink-muted">
              ₹{ritual.indicativePriceMin} – ₹{ritual.indicativePriceMax}
            </p>
          </Card>
        </div>

        {purohits.length > 0 && (
          <div className="mt-10">
            <h2 className="font-semibold text-ink">Purohits offering this ritual</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {purohits.map((p) => (
                <LocationCard
                  key={p.id}
                  href={`/purohits/${p.id}`}
                  image={p.photo ?? undefined}
                  title={p.name.en}
                  subtitle={p.languages.join(", ")}
                  meta={`${p.experienceYears} years experience`}
                />
              ))}
            </div>
          </div>
        )}
        {purohits.length === 0 && (
          <p className="mt-10 text-sm text-ink-muted">
            No verified purohits currently list this ritual. <Link href="/purohits" className="text-river-current hover:underline">Browse all purohits</Link>.
          </p>
        )}
      </div>
    </SiteShell>
  );
}
