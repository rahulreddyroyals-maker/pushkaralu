import type { NextRequest } from "next/server";
import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { crowdDeps } from "@/features/ghats/crowdDeps";
import { updateCrowd } from "@/features/ghats/crowdService";

/** MODERATOR and above (enforced in the service). One manual staff report; followers are alerted only on a meaningful change. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; ghatId: string }> }) {
  return guarded(async () => {
    const { id, ghatId } = await params;
    return toHttp(await updateCrowd(crowdDeps, await getActor(), id, ghatId, await req.json().catch(() => null)));
  });
}
