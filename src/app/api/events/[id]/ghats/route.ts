import { NextRequest, NextResponse } from "next/server";
import { listGhats } from "@/features/ghats/api";
import { GHAT_FACILITIES, type GhatFacility } from "@/features/ghats/types";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const { searchParams } = req.nextUrl;
  const cursor = searchParams.get("cursor");
  const search = searchParams.get("search") ?? undefined;
  const facilityParam = searchParams.get("facility");
  const facility = (GHAT_FACILITIES as readonly string[]).includes(facilityParam ?? "")
    ? (facilityParam as GhatFacility)
    : undefined;

  const result = await listGhats(eventId, { cursor, search, facility, includeUnpublished: false });
  return NextResponse.json(result);
}
