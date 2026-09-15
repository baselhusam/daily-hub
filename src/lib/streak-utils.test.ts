import { describe, expect, it } from "vitest";
import {
  calculateStreakInfo,
  emptyStreakInfo,
  formatEstimate,
  mkSparkBars,
} from "@/lib/streak-utils";

describe("emptyStreakInfo", () => {
  it("reports no streak when there are no active habits", () => {
    const info = emptyStreakInfo();

    expect(info.streak).toBe(0);
    expect(info.dots).toHaveLength(14);
    expect(info.dots).toEqual(
      Array.from({ length: 14 }, () => ({ color: "var(--track)" }))
    );
  });
});

describe("calculateStreakInfo", () => {
  it("does not count days before the first active habit existed", () => {
    const today = new Date(2026, 8, 2);
    const info = calculateStreakInfo(
      [
        {
          id: "habit-1",
          weekdays: [1, 2, 3, 4, 5, 6, 0],
          createdAt: new Date(2026, 8, 1),
        },
      ],
      [
        {
          entityId: "habit-1",
          completedOn: new Date(2026, 8, 1),
        },
        {
          entityId: "habit-1",
          completedOn: new Date(2026, 8, 2),
        },
      ],
      today
    );

    expect(info.streak).toBe(2);
  });
});

describe("mkSparkBars", () => {
  it("computes bars without meta when no days are given (legacy shape)", () => {
    const bars = mkSparkBars([0, 2, 4]);

    expect(bars).toHaveLength(3);
    expect(bars[0]).toEqual({
      value: 0,
      height: 18,
      empty: true,
      today: false,
    });
    expect(bars[2]).toEqual({
      value: 4,
      height: 100,
      empty: false,
      today: true, // default todayIndex is values.length - 1
    });
    for (const bar of bars) {
      expect(bar.date).toBeUndefined();
      expect(bar.label).toBeUndefined();
      expect(bar.fullLabel).toBeUndefined();
    }
  });

  it("respects an explicit todayIndex", () => {
    const bars = mkSparkBars([1, 2, 3], 0);

    expect(bars[0].today).toBe(true);
    expect(bars[1].today).toBe(false);
    expect(bars[2].today).toBe(false);
  });

  it("attaches date/label/fullLabel metadata when days are provided", () => {
    const days = [
      { date: "2026-09-01", label: "1 Sep", fullLabel: "Tuesday, 1 September" },
      { date: "2026-09-02", label: "2 Sep", fullLabel: "Wednesday, 2 September" },
    ];
    const bars = mkSparkBars([3, 5], 1, days);

    expect(bars[0]).toMatchObject({
      value: 3,
      date: "2026-09-01",
      label: "1 Sep",
      fullLabel: "Tuesday, 1 September",
    });
    expect(bars[1]).toMatchObject({
      value: 5,
      today: true,
      date: "2026-09-02",
      label: "2 Sep",
      fullLabel: "Wednesday, 2 September",
    });
  });

  it("leaves meta undefined for indexes past the end of a shorter days array", () => {
    const bars = mkSparkBars([1, 2, 3], 2, [
      { date: "2026-09-01", label: "1 Sep", fullLabel: "Tuesday, 1 September" },
    ]);

    expect(bars[0].date).toBe("2026-09-01");
    expect(bars[1].date).toBeUndefined();
    expect(bars[2].date).toBeUndefined();
  });
});

describe("formatEstimate", () => {
  it("keeps odd minutes instead of rounding to a decimal hour", () => {
    expect(formatEstimate(45)).toBe("45m");
    expect(formatEstimate(60)).toBe("1h");
    expect(formatEstimate(90)).toBe("1.5h");
    expect(formatEstimate(80)).toBe("1h 20m");
    expect(formatEstimate(150)).toBe("2.5h");
    expect(formatEstimate(0)).toBeUndefined();
  });
});
