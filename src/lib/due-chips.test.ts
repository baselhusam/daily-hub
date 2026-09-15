import { describe, expect, it } from "vitest";
import { dueChipsFor, formatCustomDue, parseEstimateInput } from "@/lib/due-chips";

describe("parseEstimateInput", () => {
  it("reads minutes, hours and mixed forms", () => {
    expect(parseEstimateInput("45")).toBe(45);
    expect(parseEstimateInput("45m")).toBe(45);
    expect(parseEstimateInput("90 min")).toBe(90);
    expect(parseEstimateInput("1.5h")).toBe(90);
    expect(parseEstimateInput("1,5 h")).toBe(90);
    expect(parseEstimateInput("2 hours")).toBe(120);
    expect(parseEstimateInput("1h 30m")).toBe(90);
    expect(parseEstimateInput("1h30")).toBe(90);
    expect(parseEstimateInput(" 3H ")).toBe(180);
  });

  it("rejects what it cannot read or store", () => {
    expect(parseEstimateInput("")).toBeNull();
    expect(parseEstimateInput("soon")).toBeNull();
    expect(parseEstimateInput("0")).toBeNull();
    expect(parseEstimateInput("-5")).toBeNull();
    expect(parseEstimateInput("20h")).toBeNull();
    expect(parseEstimateInput("m")).toBeNull();
  });
});

describe("dueChipsFor", () => {
  it("offers Friday midweek and rolls to Monday late in the week", () => {
    const tuesday = new Date(2026, 8, 15);
    expect(dueChipsFor(tuesday).map((chip) => chip.label)).toEqual(["Today", "Tomorrow", "Fri", "Next week"]);
    const thursday = new Date(2026, 8, 17);
    expect(dueChipsFor(thursday)[2]).toEqual({ label: "Mon", value: "2026-09-21" });
  });
});

describe("formatCustomDue", () => {
  it("drops the year inside the current year", () => {
    const today = new Date(2026, 8, 16);
    expect(formatCustomDue("2026-10-02", today)).toBe("Oct 2");
    expect(formatCustomDue("2027-01-05", today)).toBe("Jan 5, 2027");
  });
});
