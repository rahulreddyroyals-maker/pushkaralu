import { NextRequest, NextResponse } from "next/server";
import { listPurohits } from "@/features/purohits/api";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const cursor = searchParams.get("cursor");
  const search = searchParams.get("search") ?? undefined;
  const language = searchParams.get("language") ?? undefined;
  const ritualId = searchParams.get("ritualId") ?? undefined;

  const result = await listPurohits({ cursor, search, language, ritualId, includeUnverified: false });
  return NextResponse.json(result);
}
