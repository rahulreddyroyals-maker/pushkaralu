import type { NextRequest } from "next/server";
import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { familyDeps } from "@/features/family/deps";
import { deleteGroup, getGroupView } from "@/features/family/service";

type Ctx = { params: Promise<{ groupId: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  return guarded(async () => toHttp(await getGroupView(familyDeps, await getActor(), (await params).groupId)));
}
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  return guarded(async () => toHttp(await deleteGroup(familyDeps, await getActor(), (await params).groupId)));
}
