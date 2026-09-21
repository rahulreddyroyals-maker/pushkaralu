import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { SiteShell } from "@/components/layout/SiteShell";
import { getBusiness } from "@/features/businesses/api";
import { BUSINESS_CATEGORY_LABELS } from "@/features/businesses/types";
import { Breadcrumb, Card, Badge } from "@/components/ui";
import { MapEmbed } from "@/components/ui/MapEmbed";
import { LeadForm } from "@/components/marketplace/LeadForm";
import { BookingForm } from "@/features/bookings/components/BookingForm";
import { ROUTES } from "@/config/app";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ businessId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { businessId } = await params;
  const business = await getBusiness(businessId);
  if (!business) return {};
  return { title: business.seo?.title?.en ?? business.name.en, description: business.seo?.description?.en ?? business.description.en };
}

export default async function BusinessDetailPage({ params }: PageProps) {
  const { businessId } = await params;
  const business = await getBusiness(businessId);
  if (!business) notFound();

  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Home", href: ROUTES.home }, { label: business.name.en }]} />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-ink">{business.name.en}</h1>
          <Badge tone="info">{BUSINESS_CATEGORY_LABELS[business.category]}</Badge>
        </div>
        <p className="mt-2 text-ink-muted">{business.address}</p>

        {business.images.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {business.images.map((src, i) => (
              <div key={src} className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] bg-river-mist">
                <Image src={src} alt={`${business.name.en} photo ${i + 1}`} fill className="object-cover" />
              </div>
            ))}
          </div>
        )}

        <p className="mt-6 text-ink-muted">{business.description.en}</p>

        <Card padding="md" className="mt-6">
          <h2 className="font-semibold text-ink">Pricing</h2>
          <p className="mt-2 text-sm text-ink-muted">{business.pricingNote.en}</p>
        </Card>

        <div className="mt-6">
          <MapEmbed location={business.location} label={business.name.en} />
        </div>

        <div className="mt-8 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
          <BookingForm providerId={business.id} providerType="business" />
          <LeadForm providerId={business.id} providerType="business" />
        </div>
      </div>
    </SiteShell>
  );
}
