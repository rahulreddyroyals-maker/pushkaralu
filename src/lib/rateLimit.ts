/** Fixed-window rate limiter over a small store port (Firestore in production, memory in tests). */
export interface RateStore {
  /** Atomically: if the stored window is current, count+1; otherwise start a new window at count 1. Returns the new count and window start. */
  hit(key: string, windowMs: number, now: number): Promise<{ count: number; windowStart: number }>;
}

export interface RateDecision { allowed: boolean; remaining: number; retryAfterSeconds: number }

export async function checkRate(store: RateStore, key: string, limit: number, windowMs: number, now: number): Promise<RateDecision> {
  const { count, windowStart } = await store.hit(key, windowMs, now);
  const retryAfterSeconds = Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000));
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), retryAfterSeconds };
}

export function createMemoryRateStore(): RateStore {
  const map = new Map<string, { count: number; windowStart: number }>();
  return {
    async hit(key, windowMs, now) {
      const cur = map.get(key);
      const next = cur && now - cur.windowStart < windowMs ? { count: cur.count + 1, windowStart: cur.windowStart } : { count: 1, windowStart: now };
      map.set(key, next);
      return next;
    },
  };
}
