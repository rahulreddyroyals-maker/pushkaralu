import type { NextRequest } from "next/server";
import { adminUpdate, adminDelete } from "@/lib/catalog/server/handlers";

type Ctx = { params: Promise<{ catalog: string; id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { catalog, id } = await params;
  return adminUpdate(req, catalog, id);
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { catalog, id } = await params;
  return adminDelete(req, catalog, id);
}
