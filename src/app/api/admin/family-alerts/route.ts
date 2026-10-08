import { getActor, guarded, toHttp } from "@/lib/serviceHttp";
import { familyDeps } from "@/features/family/deps";
import { listEscalatedAlerts } from "@/features/family/service";

/** Staff see ONLY alerts whose sender chose to escalate — see service.listEscalatedAlerts. */
export async function GET() {
  return guarded(async () => toHttp(await listEscalatedAlerts(familyDeps, await getActor())));
}
