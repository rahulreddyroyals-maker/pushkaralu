import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { lostFoundDeps } from "@/features/lostFound/deps";
import { listMine } from "@/features/lostFound/service";

export async function GET() {
  return guarded(async () => toHttp(await listMine(lostFoundDeps, await getActor())));
}
