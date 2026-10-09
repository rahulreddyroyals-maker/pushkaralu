import type { NextRequest } from "next/server";
import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { notificationDeps } from "@/features/notifications/deps";
import { listInbox } from "@/features/notifications/service";

export async function GET(req: NextRequest) {
  return guarded(async () => toHttp(await listInbox(notificationDeps, await getActor(), { cursor: req.nextUrl.searchParams.get("cursor") })));
}
