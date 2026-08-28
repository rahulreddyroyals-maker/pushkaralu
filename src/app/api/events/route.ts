import { NextRequest, NextResponse } from "next/server";
import { listEvents } from "@/features/events/api";

/** Public — always published-only, regardless of caller's auth state. Admin listing uses listEvents() directly from the Server Component instead. */
export async function GET(req: NextRequest) {
  const cursor = req.nextUrl.searchParams.get("cursor");
  const result = await listEvents({ cursor, includeUnpublished: false });
  return NextResponse.json(result);
}
