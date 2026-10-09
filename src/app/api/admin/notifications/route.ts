import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { notificationDeps } from "@/features/notifications/deps";
import { composeCampaign, dispatchCampaign, listCampaigns } from "@/features/notifications/service";

export async function GET() {
  return guarded(async () => toHttp(await listCampaigns(notificationDeps, await getActor())));
}

/** Creates (and, when not scheduled for later, starts delivering) a notification. Authorization is per category, inside the service. */
export async function POST(req: NextRequest) {
  return guarded(async () => {
    const created = await composeCampaign(notificationDeps, await getActor(), await req.json().catch(() => null));
    if (!created.ok) return toHttp(created);
    // Due now: start immediately. Anything left over (large audiences) is finished by the cron job.
    if (Date.parse(created.data.scheduledFor) <= Date.now()) await dispatchCampaign(notificationDeps, created.data.id);
    return NextResponse.json(created.data, { status: 201 });
  });
}
