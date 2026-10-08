import type { NextRequest } from "next/server";
import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { familyDeps } from "@/features/family/deps";
import { joinWithCode } from "@/features/family/service";

export async function POST(req: NextRequest) {
  return guarded(async () => toHttp(await joinWithCode(familyDeps, await getActor(), await req.json().catch(() => null))));
}
