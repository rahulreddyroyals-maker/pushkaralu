import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { SiteShell } from "@/components/layout/SiteShell";
import { getTemple } from "@/features/temples/api";
import { Breadcrumb, Card, Badge } from "@/components/ui";
import { MapEmbed } from "@/components/ui/MapEmbed";
import { ROUTES } from "@/config/app";

// force-dynamic — see src/app/events/page.tsx for rationale.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ templeId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { templeId } = await params;
  const temple = await getTemple(templeId);
  if (!temple) return {};
  return { title: temple.seo?.title?.en ?? temple.name.en, description: temple.seo?.description?.en ?? temple.description.en };
}

export default async function TempleDetailPage({ params }: PageProps) {
  const { templeId } = await params;
  const temple = await getTemple(templeId);
  if (!temple) notFound();

  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Home", href: ROUTES.home }, { label: "Temples", href: "/temples" }, { label: temple.name.en }]} />

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink">{temple.name.en}</h1>
        <p className="mt-2 text-ink-muted">{temple.address}</p>

        {temple.images.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {temple.images.map((src, i) => (
              <div key={src} className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] bg-river-mist">
                <Image src={src} alt={`${temple.name.en} photo ${i + 1}`} fill className="object-cover" />
              </div>
            ))}
          </div>
        )}

        <p className="mt-6 text-ink-muted">{temple.description.en}</p>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Card padding="md">
            <h2 className="font-semibold text-ink">Timings</h2>
            <p className="mt-2 font-data text-sm text-ink-muted">{temple.timings}</p>
          </Card>
          <Card padding="md">
            <h2 className="font-semibold text-ink">History</h2>
            <p className="mt-2 text-sm text-ink-muted">{temple.history.en}</p>
          </Card>
        </div>

        {temple.nearbyAttractions.length > 0 && (
          <div className="mt-6">
            <h2 className="font-semibold text-ink">Nearby attractions</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {temple.nearbyAttractions.map((a) => (
                <Badge key={a} tone="info">
                  {a}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <h2 className="font-semibold text-ink">Location & directions</h2>
          <div className="mt-3">
            <MapEmbed location={temple.location} label={temple.name.en} />
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
