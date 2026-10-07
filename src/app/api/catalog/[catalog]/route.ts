import type { NextRequest } from "next/server";
import { publicList } from "@/lib/catalog/server/handlers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ catalog: string }> }) {
  const { catalog } = await params;
  return publicList(req, catalog);
}
