import type { NextRequest } from "next/server";
import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { notificationDeps } from "@/features/notifications/deps";
import { getPreferences, updatePreferences } from "@/features/notifications/service";

export async function GET() {
  return guarded(async () => toHttp(await getPreferences(notificationDeps, await getActor())));
}
export async function PUT(req: NextRequest) {
  return guarded(async () => toHttp(await updatePreferences(notificationDeps, await getActor(), await req.json().catch(() => null))));
}
