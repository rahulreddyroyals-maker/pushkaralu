import { NextRequest, NextResponse } from "next/server";
import { listHotels } from "@/features/hotels/api";
import { HOTEL_AMENITIES, type HotelAmenity } from "@/features/hotels/types";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const cursor = searchParams.get("cursor");
  const search = searchParams.get("search") ?? undefined;
  const amenityParam = searchParams.get("amenity");
  const amenity = (HOTEL_AMENITIES as readonly string[]).includes(amenityParam ?? "") ? (amenityParam as HotelAmenity) : undefined;

  const result = await listHotels({ cursor, search, amenity, includeUnverified: false });
  return NextResponse.json(result);
}
