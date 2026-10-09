import type { NextRequest } from "next/server";
import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { notificationDeps } from "@/features/notifications/deps";
import { markRead } from "@/features/notifications/service";

export async function POST(req: NextRequest) {
  return guarded(async () => toHttp(await markRead(notificationDeps, await getActor(), await req.json().catch(() => null))));
}
