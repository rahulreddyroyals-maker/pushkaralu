import type { NextRequest } from "next/server";
import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { familyDeps } from "@/features/family/deps";
import { clearMeetingPoint, setMeetingPoint } from "@/features/family/service";

type Ctx = { params: Promise<{ groupId: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  return guarded(async () => toHttp(await setMeetingPoint(familyDeps, await getActor(), (await params).groupId, await req.json().catch(() => null))));
}
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  return guarded(async () => toHttp(await clearMeetingPoint(familyDeps, await getActor(), (await params).groupId)));
}
