import type { NextRequest } from "next/server";
import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { familyDeps } from "@/features/family/deps";
import { createGroup, listMyGroups } from "@/features/family/service";

export async function GET() {
  return guarded(async () => toHttp(await listMyGroups(familyDeps, await getActor())));
}
export async function POST(req: NextRequest) {
  return guarded(async () => toHttp(await createGroup(familyDeps, await getActor(), await req.json().catch(() => null))));
}
