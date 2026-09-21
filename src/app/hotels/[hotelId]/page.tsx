import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { SiteShell } from "@/components/layout/SiteShell";
import { getHotel } from "@/features/hotels/api";
import { Breadcrumb, Card, Badge } from "@/components/ui";
import { MapEmbed } from "@/components/ui/MapEmbed";
import { LeadForm } from "@/components/marketplace/LeadForm";
import { BookingForm } from "@/features/bookings/components/BookingForm";
import { ROUTES } from "@/config/app";

export const dynamic = "force-dynamic";

const AMENITY_LABELS: Record<string, string> = {
  wifi: "WiFi",
  ac: "AC",
  parking: "Parking",
  restaurant: "Restaurant",
  room_service: "Room service",
  hot_water: "Hot water",
  elevator: "Elevator",
  pilgrim_friendly_timings: "Pilgrim-friendly timings",
};

interface PageProps {
  params: Promise<{ hotelId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { hotelId } = await params;
  const hotel = await getHotel(hotelId);
  if (!hotel) return {};
  return { title: hotel.seo?.title?.en ?? hotel.name.en, description: hotel.seo?.description?.en ?? hotel.description.en };
}

export default async function HotelDetailPage({ params }: PageProps) {
  const { hotelId } = await params;
  const hotel = await getHotel(hotelId);
  if (!hotel) notFound();

  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Home", href: ROUTES.home }, { label: "Hotels", href: "/hotels" }, { label: hotel.name.en }]} />

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink">{hotel.name.en}</h1>
        <p className="mt-2 text-ink-muted">{hotel.address}</p>
        <p className="mt-2 font-data text-lg font-medium text-river-deep">
          ₹{hotel.priceRangeMin}–₹{hotel.priceRangeMax} / night
        </p>

        {hotel.images.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {hotel.images.map((src, i) => (
              <div key={src} className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] bg-river-mist">
                <Image src={src} alt={`${hotel.name.en} photo ${i + 1}`} fill className="object-cover" />
              </div>
            ))}
          </div>
        )}

        <p className="mt-6 text-ink-muted">{hotel.description.en}</p>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Card padding="md">
            <h2 className="font-semibold text-ink">Amenities</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {hotel.amenities.length === 0 && <span className="text-sm text-ink-muted">Not specified</span>}
              {hotel.amenities.map((a) => (
                <Badge key={a} tone="info">
                  {AMENITY_LABELS[a] ?? a}
                </Badge>
              ))}
            </div>
          </Card>
          <Card padding="md">
            <h2 className="font-semibold text-ink">Policies</h2>
            <p className="mt-2 text-sm text-ink-muted">{hotel.policies?.en || "Not specified"}</p>
          </Card>
        </div>

        <div className="mt-6">
          <MapEmbed location={hotel.location} label={hotel.name.en} />
        </div>

        <div className="mt-8 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
          <BookingForm providerId={hotel.id} providerType="hotel" suggestedAmount={hotel.priceRangeMin} />
          <LeadForm providerId={hotel.id} providerType="hotel" />
        </div>
      </div>
    </SiteShell>
  );
}
