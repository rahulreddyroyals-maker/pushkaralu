/** Day keys are calendar days in India (IST, UTC+5:30) — the audience's day, not the server's. */
const IST_OFFSET_MS = 5.5 * 3_600_000;

export function dayKey(date: Date): string {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const RANGE_OPTIONS = [7, 30, 90] as const;
export type RangeDays = (typeof RANGE_OPTIONS)[number];

export function parseRange(value: unknown): RangeDays {
  const n = Number(value);
  return (RANGE_OPTIONS as readonly number[]).includes(n) ? (n as RangeDays) : 30;
}

/** Inclusive list of day keys ending today. */
export function rangeKeys(days: number, now: Date): string[] {
  const end = dayKey(now);
  return Array.from({ length: days }, (_, i) => addDays(end, i - (days - 1)));
}

/** Instants (UTC) bounding a day-key range, for timestamp queries on bookings/leads. */
export function rangeBounds(keys: string[]): { from: Date; to: Date } {
  const from = new Date(`${keys[0]}T00:00:00Z`).getTime() - IST_OFFSET_MS;
  const to = new Date(`${keys[keys.length - 1]}T00:00:00Z`).getTime() - IST_OFFSET_MS + 86_400_000;
  return { from: new Date(from), to: new Date(to) };
}
