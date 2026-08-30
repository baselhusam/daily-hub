import { describe, expect, it } from "vitest";
import { emptyStreakInfo } from "@/lib/streak-utils";

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
