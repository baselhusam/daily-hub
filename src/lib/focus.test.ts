import { describe, expect, it } from "vitest";
import { focusRemainingLabel, focusUntilFor, isFocusActive } from "./focus";

const today = new Date(2026, 9, 5);
const day = (offset: number) => new Date(2026, 9, 5 + offset);

describe("focusUntilFor", () => {
  it("counts today as the first day of a span", () => {
    expect(focusUntilFor("today", today)).toEqual(day(0));
    expect(focusUntilFor("3d", today)).toEqual(day(2));
    expect(focusUntilFor("week", today)).toEqual(day(6));
  });

  it("leaves an open focus without an end", () => {
    expect(focusUntilFor("open", today)).toBeNull();
  });
});

describe("isFocusActive", () => {
  it("is off until focusedAt is set", () => {
    expect(isFocusActive({ focusedAt: null, focusUntil: null }, today)).toBe(false);
    expect(isFocusActive({ focusedAt: null, focusUntil: day(3) }, today)).toBe(false);
  });

  it("lasts through its final day and lapses the day after", () => {
    const item = { focusedAt: day(-2), focusUntil: day(0) };
    expect(isFocusActive(item, today)).toBe(true);
    expect(isFocusActive(item, day(1))).toBe(false);
  });

  it("never lapses when open-ended", () => {
    expect(isFocusActive({ focusedAt: day(-40), focusUntil: null }, today)).toBe(true);
  });
});

describe("focusRemainingLabel", () => {
  it("names the time left, counting today", () => {
    expect(focusRemainingLabel({ focusedAt: today, focusUntil: day(0) }, today)).toBe("Last day");
    expect(focusRemainingLabel({ focusedAt: today, focusUntil: day(2) }, today)).toBe(
      "3 days left"
    );
    expect(focusRemainingLabel({ focusedAt: today, focusUntil: null }, today)).toBe("Ongoing");
  });

  it("says nothing once the focus has lapsed", () => {
    expect(focusRemainingLabel({ focusedAt: day(-5), focusUntil: day(-1) }, today)).toBeNull();
  });
});
