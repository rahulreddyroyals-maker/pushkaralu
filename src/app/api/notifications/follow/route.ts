import type { NextRequest } from "next/server";
import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { notificationDeps } from "@/features/notifications/deps";
import { setFollow } from "@/features/notifications/service";

export async function POST(req: NextRequest) {
  return guarded(async () => toHttp(await setFollow(notificationDeps, await getActor(), await req.json().catch(() => null))));
}
