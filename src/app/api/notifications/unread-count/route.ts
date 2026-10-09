import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { notificationDeps } from "@/features/notifications/deps";
import { unreadCount } from "@/features/notifications/service";

export async function GET() {
  return guarded(async () => toHttp(await unreadCount(notificationDeps, await getActor())));
}
