import type { NextRequest } from "next/server";
import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { familyDeps } from "@/features/family/deps";
import { createInvite } from "@/features/family/service";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  return guarded(async () => toHttp(await createInvite(familyDeps, await getActor(), (await params).groupId)));
}
