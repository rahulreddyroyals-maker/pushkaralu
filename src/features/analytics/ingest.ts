import { batchSchema, isBot, resolveEvent } from "@/lib/analytics/events";
import { dayKey } from "@/lib/analytics/days";
import { fail, ok, type ServiceResult } from "@/lib/serviceResult";
import { checkRate, type RateStore } from "@/lib/rateLimit";
import type { AnalyticsStore, CounterDelta } from "./store";

export interface IngestDeps {
  store: AnalyticsStore;
  rateStore: RateStore;
  now: () => Date;
  shard: () => number;
}

/** Requests (each carrying up to 20 events) one visitor may send per minute. */
export const INGEST_REQUESTS_PER_MINUTE = 30;

/**
 * Public, unauthenticated by design (visitors aren't signed in) — so it is
 * strict instead: bots dropped, schema whitelist, per-visitor rate limit,
 * and only counters are written. Nothing returned reveals any stored data.
 */
export async function ingest(deps: IngestDeps, visitorKey: string, userAgent: string | null, body: unknown): Promise<ServiceResult<{ accepted: number }>> {
  if (isBot(userAgent)) return ok({ accepted: 0 }, 202);
  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) return fail(400, "Invalid request");

  const now = deps.now();
  const decision = await checkRate(deps.rateStore, `an:${visitorKey}`, INGEST_REQUESTS_PER_MINUTE, 60_000, now.getTime());
  if (!decision.allowed) return fail(429, "Too many requests");

  const day = dayKey(now);
  const deltas: CounterDelta[] = parsed.data.events.flatMap((e) => resolveEvent(e)).map((e) => ({ ...e, day, shard: deps.shard() }));
  if (deltas.length) await deps.store.add(deltas);
  return ok({ accepted: deltas.length }, 202);
}
