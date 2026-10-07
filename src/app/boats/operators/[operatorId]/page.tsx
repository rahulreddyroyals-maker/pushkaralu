import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DetailShell, Section, Facts, catalogMetadata, pick } from "@/components/catalog/DetailShell";
import { DirectionsButton } from "@/components/catalog/DirectionsButton";
import { MapEmbed } from "@/components/ui/MapEmbed";
import { LocationCard, EmptyState } from "@/components/ui";
import { loadPublic, loadPublicBy } from "@/features/catalog/publicApi";
import { cardFor, type CatalogItem } from "@/features/catalog/cards";
import type { Boat, BoatOperator, BoatRoute } from "@/features/boats/definition";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ operatorId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { operatorId } = await params;
  const o = await loadPublic<BoatOperator>("boat-operators", operatorId);
  return catalogMetadata(o, o ? pick(o.name) : "", o ? pick(o.description) : "");
}

export default async function BoatOperatorPage({ params }: Props) {
  const { operatorId } = await params;
  const operator = await loadPublic<BoatOperator>("boat-operators", operatorId);
  if (!operator) notFound();

  const [boats, routes] = await Promise.all([
    loadPublicBy<Boat>("boats", "operatorId", operator.id),
    loadPublicBy<BoatRoute>("boat-routes", "operatorId", operator.id),
  ]);

  return (
    <DetailShell
      crumbs={[{ label: "Boats", href: "/boats" }, { label: pick(operator.name) }]}
      title={pick(operator.name)}
      subtitle={operator.address}
      images={operator.images}
    >
      <p className="text-ink-muted">{pick(operator.description)}</p>
      <Section title="About this operator">
        <Facts rows={[["Licence / permit", operator.licenceNote]]} />
      </Section>

      <div>
        <h2 className="mb-3 font-semibold text-ink">Routes</h2>
        {routes.length === 0 ? (
          <EmptyState title="No routes published" description="This operator has no published routes yet." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {routes.map((r) => (
              <LocationCard key={r.id} {...cardFor("boat-routes", r as unknown as CatalogItem)} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-ink">Boats</h2>
        {boats.length === 0 ? (
          <p className="text-sm text-ink-muted">No boats listed.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {boats.map((b) => (
              <LocationCard key={b.id} {...cardFor("boats", b as unknown as CatalogItem)} />
            ))}
          </div>
        )}
      </div>

      <div>
        <MapEmbed location={operator.location} label={operator.name.en} />
        <div className="mt-3">
          <DirectionsButton location={operator.location} label="Directions to main jetty" />
        </div>
      </div>
    </DetailShell>
  );
}
