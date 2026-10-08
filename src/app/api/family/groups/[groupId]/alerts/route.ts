import type { NextRequest } from "next/server";
import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { familyDeps } from "@/features/family/deps";
import { sendAlert } from "@/features/family/service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  return guarded(async () => toHttp(await sendAlert(familyDeps, await getActor(), (await params).groupId, await req.json().catch(() => null))));
}
