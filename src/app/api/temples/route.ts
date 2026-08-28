import { NextRequest, NextResponse } from "next/server";
import { listTemples } from "@/features/temples/api";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const cursor = searchParams.get("cursor");
  const search = searchParams.get("search") ?? undefined;

  const result = await listTemples({ cursor, search, includeUnpublished: false });
  return NextResponse.json(result);
}
