import { describe, expect, it } from "vitest";
import { calculateStreakInfo, emptyStreakInfo } from "@/lib/streak-utils";

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
