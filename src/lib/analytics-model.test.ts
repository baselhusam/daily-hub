import { describe, expect, it } from "vitest";
import {
  countsByDay,
  gridTop,
  hourProfile,
  longestQuietGap,
  movingAverage,
  peakWindow,
  periodDelta,
  weekdayAverages,
  type AnalyticsDay,
  type AnalyticsEvent,
} from "@/lib/analytics-model";

const days: AnalyticsDay[] = Array.from({ length: 6 }, (_, index) => ({
  date: `2026-09-0${index + 1}`,
  label: `${index + 1} Sep`,
  fullLabel: `Day ${index + 1}`,
  weekday: (2 + index) % 7, // Sep 1 2026 is a Tuesday
  isToday: index === 5,
}));
const event = (date: string, extra: Partial<AnalyticsEvent> = {}): AnalyticsEvent => ({
  date,
  hour: 9,
  kind: "task",
  projectId: "p1",
  entityId: "t",
  minutes: 30,
  ...extra,
});

describe("countsByDay", () => {
  it("buckets matching events onto the day axis", () => {
    const events = [event("2026-09-01"), event("2026-09-01"), event("2026-09-03", { kind: "habit" }), event("2026-08-30")];
    expect(countsByDay(events, days)).toEqual([2, 0, 1, 0, 0, 0]);
    expect(countsByDay(events, days, (e) => e.kind === "task")).toEqual([2, 0, 0, 0, 0, 0]);
  });
});

describe("periodDelta", () => {
  it("compares the last half against the half before it", () => {
    expect(periodDelta([1, 1, 1, 2, 2, 2], 3)).toEqual({ recent: 6, prior: 3, pct: 100 });
    expect(periodDelta([0, 0, 1, 1], 2)).toEqual({ recent: 2, prior: 0, pct: null });
  });
});

describe("weekdayAverages / hourProfile / peakWindow", () => {
  it("averages per weekday", () => {
    const averages = weekdayAverages([2, 0, 1, 0, 0, 4], days);
    expect(averages[2]).toBe(2); // Tuesday
    expect(averages[0]).toBe(4); // Sunday
    expect(averages[1]).toBe(0); // Monday never in range
  });

  it("profiles completions by hour per day and finds the busiest window", () => {
    const events = [event("2026-09-01", { hour: 9 }), event("2026-09-02", { hour: 10 }), event("2026-09-02", { hour: 9 })];
    const profile = hourProfile(events, days);
    expect(profile[9]).toBeCloseTo(2 / 6);
    expect(profile[10]).toBeCloseTo(1 / 6);
    expect(peakWindow(profile)).toEqual([9, 11]);
    expect(peakWindow(new Array(24).fill(0))).toBeNull();
  });
});

describe("movingAverage / longestQuietGap / gridTop", () => {
  it("smooths and finds gaps", () => {
    expect(movingAverage([2, 4, 6], 2)).toEqual([2, 3, 5]);
    expect(longestQuietGap([1, 0, 0, 0, 2, 0], days)).toEqual({ length: 3, from: days[1] });
    expect(gridTop(9)).toEqual({ top: 12, step: 3 });
    expect(gridTop(30)).toEqual({ top: 32, step: 8 });
  });
});
