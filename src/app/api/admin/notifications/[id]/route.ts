import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { notificationDeps } from "@/features/notifications/deps";
import { getCampaignDetail } from "@/features/notifications/service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(async () => toHttp(await getCampaignDetail(notificationDeps, await getActor(), (await params).id)));
}
