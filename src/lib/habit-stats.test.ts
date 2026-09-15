import { describe, expect, it } from "vitest";
import {
  chainHistory,
  completionKeys,
  consistency,
  currentChain,
  strip,
  weeklyConsistency,
} from "@/lib/habit-stats";

// A Thursday.
const today = new Date(2026, 8, 10);
const day = (offset: number) =>
  new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
const weekdaysOnly = { id: "h", weekdays: [1, 2, 3, 4, 5], createdAt: day(-60), isActive: true };
const logs = (offsets: number[]) => offsets.map((o) => ({ entityId: "h", completedOn: day(o) }));

describe("currentChain", () => {
  it("counts back over scheduled days and skips off days", () => {
    // Fri -6, Mon -3, Tue -2, Wed -1 done; today (Thu) not yet.
    const keys = completionKeys(logs([-6, -3, -2, -1])).get("h");
    expect(currentChain(weekdaysOnly, keys, today)).toBe(4);
  });

  it("adds today once it is done and breaks on a missed scheduled day", () => {
    const keys = completionKeys(logs([-3, -1, 0])).get("h");
    // Wed -1 and Thu 0 done, Tue -2 missed.
    expect(currentChain(weekdaysOnly, keys, today)).toBe(2);
  });

  it("is zero with no history", () => {
    expect(currentChain(weekdaysOnly, undefined, today)).toBe(0);
  });
});

describe("strip", () => {
  it("labels each of the trailing days", () => {
    const keys = completionKeys(logs([-1])).get("h");
    const cells = strip(weekdaysOnly, keys, today, 7);
    // Fri Sat Sun Mon Tue Wed Thu
    expect(cells).toEqual(["missed", "off", "off", "missed", "missed", "kept", "today-open"]);
  });
});

describe("consistency", () => {
  it("rates the trailing fortnight without today", () => {
    const keys = completionKeys(logs([-1, -2, -3, -6, -7])).get("h");
    // 14 days back from Wed -1: 10 weekdays scheduled, 5 done.
    expect(consistency(weekdaysOnly, keys, today)).toEqual({ rate: 50, scheduled: 10, missed: 5 });
  });

  it("is null before the habit has any scheduled history", () => {
    const fresh = { ...weekdaysOnly, createdAt: day(0) };
    expect(consistency(fresh, undefined, today).rate).toBeNull();
  });
});

describe("weeklyConsistency", () => {
  it("scores each week through yesterday, ignoring paused habits", () => {
    const paused = { id: "p", weekdays: [1, 2, 3, 4, 5], createdAt: day(-60), isActive: false };
    const keyMap = completionKeys(logs([-1, -2, -3]));
    const series = weeklyConsistency([weekdaysOnly, paused], keyMap, today, 1, 2);
    expect(series).toHaveLength(2);
    // Last week: 5 scheduled, 0 done. This week so far: Mon–Wed scheduled, all done.
    expect(series[0]).toEqual({ rate: 0, scheduled: 5 });
    expect(series[1]).toEqual({ rate: 100, scheduled: 3 });
  });
});

describe("chainHistory", () => {
  it("samples the chain at weekly steps ending today", () => {
    const keys = completionKeys(logs([-9, -8, -7, -6, -3, -2, -1])).get("h");
    const history = chainHistory(weekdaysOnly, keys, today, 2);
    // A week ago (Thu -7): Tue -9, Wed -8, Thu -7 done → 3. Today: Fri -6 … Wed -1 → 7.
    expect(history).toEqual([3, 7]);
  });
});
