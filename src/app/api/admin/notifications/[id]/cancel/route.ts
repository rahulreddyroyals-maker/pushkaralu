import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { notificationDeps } from "@/features/notifications/deps";
import { cancelCampaign } from "@/features/notifications/service";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(async () => toHttp(await cancelCampaign(notificationDeps, await getActor(), (await params).id)));
}
