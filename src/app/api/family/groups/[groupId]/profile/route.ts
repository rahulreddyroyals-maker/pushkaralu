import type { NextRequest } from "next/server";
import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { familyDeps } from "@/features/family/deps";
import { updateMyProfile } from "@/features/family/service";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  return guarded(async () => toHttp(await updateMyProfile(familyDeps, await getActor(), (await params).groupId, await req.json().catch(() => null))));
}
