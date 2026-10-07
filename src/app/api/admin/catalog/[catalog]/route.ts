import type { NextRequest } from "next/server";
import { adminCreate } from "@/lib/catalog/server/handlers";

export async function POST(req: NextRequest, { params }: { params: Promise<{ catalog: string }> }) {
  const { catalog } = await params;
  return adminCreate(req, catalog);
}
