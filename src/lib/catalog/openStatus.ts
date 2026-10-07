export type OpenState = "OPEN" | "CLOSED" | "UNKNOWN";

export const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface OpeningHours {
  opensAt?: string; // "HH:mm" 24h
  closesAt?: string; // "HH:mm" 24h; earlier than opensAt means "after midnight"
  closedDays?: string[];
  temporarilyClosed?: boolean;
}

function toMinutes(hhmm: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Wall-clock weekday + minutes-of-day in a given IANA timezone (Pushkaralu runs on IST, not server time). */
export function zonedClock(now: Date, timeZone: string): { weekday: Weekday; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = get("weekday").slice(0, 3).toUpperCase() as Weekday;
  return { weekday, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

/**
 * Open/closed is *computed from the published hours*, never a stored flag
 * that can silently go stale. `temporarilyClosed` is the admin's explicit
 * override. Missing/invalid hours -> UNKNOWN (we say so rather than guess).
 */
export function computeOpenState(hours: OpeningHours, now: Date = new Date(), timeZone = "Asia/Kolkata"): OpenState {
  if (hours.temporarilyClosed) return "CLOSED";
  const opens = hours.opensAt ? toMinutes(hours.opensAt) : null;
  const closes = hours.closesAt ? toMinutes(hours.closesAt) : null;
  if (opens === null || closes === null) return "UNKNOWN";

  const { weekday, minutes } = zonedClock(now, timeZone);
  const closed = (hours.closedDays ?? []).map((d) => d.toUpperCase());
  const prevWeekday = WEEKDAYS[(WEEKDAYS.indexOf(weekday) + 6) % 7]!;

  if (opens === closes) return closed.includes(weekday) ? "CLOSED" : "OPEN"; // 24h
  if (opens < closes) {
    return !closed.includes(weekday) && minutes >= opens && minutes < closes ? "OPEN" : "CLOSED";
  }
  // Overnight span (e.g. 18:00 -> 02:00): evening part belongs to today, early-morning part to yesterday's opening.
  if (minutes >= opens) return closed.includes(weekday) ? "CLOSED" : "OPEN";
  if (minutes < closes) return closed.includes(prevWeekday) ? "CLOSED" : "OPEN";
  return "CLOSED";
}
