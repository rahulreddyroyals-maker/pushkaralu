import "server-only";
import { auditSink } from "@/lib/serviceHttp";
import { notificationDeps } from "@/features/notifications/deps";
import { notifyCrowdChange } from "@/features/notifications/service";
import { getGhat, updateCrowdStatus } from "./api";
import type { CrowdDeps } from "./crowdService";

export const crowdDeps: CrowdDeps = {
  store: {
    getGhat: async (eventId, ghatId) => (await getGhat(eventId, ghatId, { includeUnpublished: true })) ?? null,
    applyUpdate: updateCrowdStatus,
  },
  audit: auditSink,
  onAlertWorthyChange: async (change) => void (await notifyCrowdChange(notificationDeps, change)),
};
