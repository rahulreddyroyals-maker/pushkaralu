import { describe, it, expect } from "vitest";
import { computeOpenState, zonedClock } from "./openStatus";

// 2026-10-07 is a Wednesday. Times below are IST (UTC+05:30) expressed in UTC.
const ist = (h: number, m: number, dayOffset = 0) => new Date(Date.UTC(2026, 9, 7 + dayOffset, h - 5, m - 30));

describe("zonedClock", () => {
  it("reads weekday and minutes in the target time zone, not server time", () => {
    expect(zonedClock(ist(9, 15), "Asia/Kolkata")).toEqual({ weekday: "WED", minutes: 9 * 60 + 15 });
  });
  it("rolls the weekday over at IST midnight", () => {
    // 19:00 UTC Wednesday = 00:30 IST Thursday
    expect(zonedClock(new Date(Date.UTC(2026, 9, 7, 19, 0)), "Asia/Kolkata").weekday).toBe("THU");
  });
});

describe("computeOpenState", () => {
  const daytime = { opensAt: "08:00", closesAt: "22:00" };

  it("is OPEN inside hours and CLOSED outside", () => {
    expect(computeOpenState(daytime, ist(12, 0))).toBe("OPEN");
    expect(computeOpenState(daytime, ist(7, 59))).toBe("CLOSED");
    expect(computeOpenState(daytime, ist(22, 0))).toBe("CLOSED"); // closing minute is exclusive
    expect(computeOpenState(daytime, ist(8, 0))).toBe("OPEN");
  });

  it("is CLOSED on a weekly closed day even within hours", () => {
    expect(computeOpenState({ ...daytime, closedDays: ["WED"] }, ist(12, 0))).toBe("CLOSED");
    expect(computeOpenState({ ...daytime, closedDays: ["TUE"] }, ist(12, 0))).toBe("OPEN");
  });

  it("temporarilyClosed overrides everything", () => {
    expect(computeOpenState({ ...daytime, temporarilyClosed: true }, ist(12, 0))).toBe("CLOSED");
  });

  it("returns UNKNOWN (never a guess) when hours are missing or malformed", () => {
    expect(computeOpenState({}, ist(12, 0))).toBe("UNKNOWN");
    expect(computeOpenState({ opensAt: "", closesAt: "" }, ist(12, 0))).toBe("UNKNOWN");
    expect(computeOpenState({ opensAt: "8am", closesAt: "10pm" }, ist(12, 0))).toBe("UNKNOWN");
  });

  it("handles overnight spans, attributing after-midnight hours to the previous day's opening", () => {
    const night = { opensAt: "18:00", closesAt: "02:00" };
    expect(computeOpenState(night, ist(23, 0))).toBe("OPEN");
    expect(computeOpenState(night, ist(1, 0))).toBe("OPEN");
    expect(computeOpenState(night, ist(3, 0))).toBe("CLOSED");
    expect(computeOpenState(night, ist(12, 0))).toBe("CLOSED");
    // Closed Tuesdays: Wednesday 01:00 belongs to Tuesday's (closed) session; Wednesday 23:00 is Wednesday's.
    expect(computeOpenState({ ...night, closedDays: ["TUE"] }, ist(1, 0))).toBe("CLOSED");
    expect(computeOpenState({ ...night, closedDays: ["TUE"] }, ist(23, 0))).toBe("OPEN");
  });

  it("treats identical open/close times as 24 hours", () => {
    expect(computeOpenState({ opensAt: "00:00", closesAt: "00:00" }, ist(3, 33))).toBe("OPEN");
  });
});
