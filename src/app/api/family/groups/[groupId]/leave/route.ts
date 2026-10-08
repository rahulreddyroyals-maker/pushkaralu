import type { NextRequest } from "next/server";
import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { familyDeps } from "@/features/family/deps";
import { leaveGroup } from "@/features/family/service";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  return guarded(async () => toHttp(await leaveGroup(familyDeps, await getActor(), (await params).groupId)));
}
