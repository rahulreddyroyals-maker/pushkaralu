import type { NextRequest } from "next/server";
import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { familyDeps } from "@/features/family/deps";
import { removeMember } from "@/features/family/service";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ groupId: string; uid: string }> }) {
  return guarded(async () => {
    const { groupId, uid } = await params;
    return toHttp(await removeMember(familyDeps, await getActor(), groupId, uid));
  });
}
