import type { NextRequest } from "next/server";
import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { familyDeps } from "@/features/family/deps";
import { resolveAlert } from "@/features/family/service";

/** DELETE here means "resolve" (close) the alert — the record is kept for the group's history. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ groupId: string; alertId: string }> }) {
  return guarded(async () => {
    const { groupId, alertId } = await params;
    return toHttp(await resolveAlert(familyDeps, await getActor(), groupId, alertId));
  });
}
