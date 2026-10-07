import type { NextRequest } from "next/server";
import { adminSetPublished } from "@/lib/catalog/server/handlers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ catalog: string; id: string }> }) {
  const { catalog, id } = await params;
  return adminSetPublished(req, catalog, id);
}
