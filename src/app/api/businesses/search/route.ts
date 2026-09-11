import { NextRequest, NextResponse } from "next/server";
import { listBusinesses } from "@/features/businesses/api";
import { BUSINESS_CATEGORIES, type BusinessCategory } from "@/features/businesses/types";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const cursor = searchParams.get("cursor");
  const search = searchParams.get("search") ?? undefined;
  // Comma-separated list — e.g. "taxi,travel_operator" for the combined Travel page.
  const categoryParam = searchParams.get("category");
  const category = categoryParam
    ? (categoryParam.split(",").filter((c) => (BUSINESS_CATEGORIES as readonly string[]).includes(c)) as BusinessCategory[])
    : undefined;

  const result = await listBusinesses({ cursor, search, category, includeUnverified: false });
  return NextResponse.json(result);
}
