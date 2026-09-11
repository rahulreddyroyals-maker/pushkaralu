import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { SiteShell } from "@/components/layout/SiteShell";
import { getPurohit } from "@/features/purohits/api";
import { getRitualsByIds } from "@/features/rituals/api";
import { listReviews, getReviewAggregate } from "@/features/reviews/api";
import { Breadcrumb, Card, Badge } from "@/components/ui";
import { MapEmbed } from "@/components/ui/MapEmbed";
import { LeadForm } from "@/components/marketplace/LeadForm";
import { ReviewsSection } from "@/components/marketplace/ReviewsSection";
import { ROUTES } from "@/config/app";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ purohitId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { purohitId } = await params;
  const purohit = await getPurohit(purohitId);
  if (!purohit) return {};
  return { title: purohit.seo?.title?.en ?? purohit.name.en, description: purohit.seo?.description?.en ?? purohit.bio.en };
}

export default async function PurohitDetailPage({ params }: PageProps) {
  const { purohitId } = await params;
  const purohit = await getPurohit(purohitId);
  if (!purohit) notFound();

  const [rituals, reviews, aggregate] = await Promise.all([
    getRitualsByIds(purohit.ritualIds),
    listReviews(purohit.id, "purohit"),
    getReviewAggregate(purohit.id, "purohit"),
  ]);

  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Home", href: ROUTES.home }, { label: "Purohits", href: "/purohits" }, { label: purohit.name.en }]} />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {purohit.photo && (
            <div className="relative h-16 w-16 overflow-hidden rounded-full bg-river-mist">
              <Image src={purohit.photo} alt={purohit.name.en} fill className="object-cover" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-ink">{purohit.name.en}</h1>
              <Badge tone="success" dot>
                Verified
              </Badge>
            </div>
            <p className="text-sm text-ink-muted">{purohit.languages.join(", ")} · {purohit.experienceYears} years experience</p>
          </div>
        </div>

        <p className="mt-6 text-ink-muted">{purohit.bio.en}</p>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Card padding="md">
            <h2 className="font-semibold text-ink">Pricing</h2>
            <p className="mt-2 text-sm text-ink-muted">{purohit.pricingNote.en}</p>
          </Card>
          <Card padding="md">
            <h2 className="font-semibold text-ink">Availability</h2>
            <p className="mt-2 text-sm text-ink-muted">{purohit.availabilityNote.en}</p>
          </Card>
        </div>

        {rituals.length > 0 && (
          <div className="mt-8">
            <h2 className="font-semibold text-ink">Rituals offered</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {rituals.map((r) => (
                <Link key={r.id} href={`/rituals/${r.id}`}>
                  <Badge tone="info">{r.name.en}</Badge>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <MapEmbed location={purohit.location} label={purohit.name.en} />
        </div>

        <div className="mt-8 max-w-md">
          <LeadForm providerId={purohit.id} providerType="purohit" />
        </div>

        <div className="mt-10">
          <ReviewsSection providerId={purohit.id} providerType="purohit" initialReviews={reviews} aggregate={aggregate} />
        </div>
      </div>
    </SiteShell>
  );
}
