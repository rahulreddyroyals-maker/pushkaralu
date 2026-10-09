import "server-only";
import { auditSink } from "@/lib/serviceHttp";
import type { Deps } from "./service";
import { notificationStore } from "./store";
import { fcmPushSender } from "./push";

export const notificationDeps: Deps = { store: notificationStore, push: fcmPushSender, audit: auditSink };
