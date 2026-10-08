import "server-only";
import { auditSink } from "@/lib/serviceHttp";
import { firestoreLostFoundStore } from "./store";
import type { Deps } from "./service";

export const lostFoundDeps: Deps = { store: firestoreLostFoundStore, audit: auditSink };
