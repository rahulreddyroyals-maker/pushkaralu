"use client";

import { useState } from "react";
import { LocationCard, Button, Select, EmptyState, ErrorState } from "@/components/ui";
import { HOTEL_AMENITIES, type Hotel, type HotelAmenity } from "@/features/hotels/types";
import type { PageResult } from "@/lib/pagination";

const AMENITY_LABELS: Record<HotelAmenity, string> = {
  wifi: "WiFi",
  ac: "AC",
  parking: "Parking",
  restaurant: "Restaurant",
  room_service: "Room service",
  hot_water: "Hot water",
  elevator: "Elevator",
  pilgrim_friendly_timings: "Pilgrim-friendly timings",
};

interface HotelListClientProps {
  initial: PageResult<Hotel>;
}

export function HotelListClient({ initial }: HotelListClientProps) {
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [amenity, setAmenity] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchHotels({ reset }: { reset: boolean }) {
    setError(null);
    setLoading(true);
    const params = new URLSearchParams();
    if (amenity) params.set("amenity", amenity);
    if (search.trim()) params.set("search", search.trim());
    if (!reset && cursor) params.set("cursor", cursor);

    try {
      const res = await fetch(`/api/hotels/search?${params.toString()}`);
      if (!res.ok) throw new Error("Request failed");
      const data: PageResult<Hotel> = await res.json();
      setItems((prev) => (reset ? data.items : [...prev, ...data.items]));
      setCursor(data.nextCursor);
    } catch {
      setError("Couldn't load hotels. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium text-ink">Search hotels</label>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchHotels({ reset: true })}
              placeholder="Search by name..."
              className="h-11 flex-1 rounded-lg border border-border bg-surface-raised px-3.5 text-sm text-ink placeholder:text-ink-muted focus:border-river-current focus:outline-none focus:ring-2 focus:ring-river-current/20"
            />
            <Button variant="outline" onClick={() => fetchHotels({ reset: true })} disabled={loading}>
              Search
            </Button>
          </div>
        </div>
        <div className="sm:w-56">
          <Select
            label="Amenity"
            placeholder="Any amenity"
            value={amenity}
            onChange={(e) => {
              setAmenity(e.target.value);
              fetchHotels({ reset: true });
            }}
            options={HOTEL_AMENITIES.map((a) => ({ value: a, label: AMENITY_LABELS[a] }))}
          />
        </div>
      </div>

      {error && <ErrorState title="Couldn't load hotels" description={error} action={{ label: "Retry", onClick: () => fetchHotels({ reset: true }) }} />}

      {!error && items.length === 0 && <EmptyState title="No hotels found" description="Try a different search or amenity filter." />}

      {items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((hotel) => (
            <LocationCard
              key={hotel.id}
              href={`/hotels/${hotel.id}`}
              image={hotel.images[0]}
              title={hotel.name.en}
              subtitle={hotel.address}
              meta={`${hotel.amenities.length} amenities`}
              price={`₹${hotel.priceRangeMin}–₹${hotel.priceRangeMax}`}
            />
          ))}
        </div>
      )}

      {cursor && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => fetchHotels({ reset: false })} disabled={loading}>
            {loading ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
