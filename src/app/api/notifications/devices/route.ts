import type { NextRequest } from "next/server";
import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { notificationDeps } from "@/features/notifications/deps";
import { registerDevice, unregisterDevice } from "@/features/notifications/service";

export async function POST(req: NextRequest) {
  return guarded(async () => toHttp(await registerDevice(notificationDeps, await getActor(), await req.json().catch(() => null))));
}
export async function DELETE(req: NextRequest) {
  return guarded(async () => toHttp(await unregisterDevice(notificationDeps, await getActor(), await req.json().catch(() => null))));
}
