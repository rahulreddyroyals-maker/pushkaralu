import type { NextRequest } from "next/server";
import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { familyDeps } from "@/features/family/deps";
import { acknowledgeEscalatedAlert } from "@/features/family/service";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return guarded(async () => toHttp(await acknowledgeEscalatedAlert(familyDeps, await getActor(), (await params).id)));
}
