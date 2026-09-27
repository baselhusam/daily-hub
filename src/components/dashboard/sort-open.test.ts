import { describe, expect, it } from "vitest";
import { sortOpenForToday } from "./project-group";

const today = new Date(2026, 8, 27);
const day = (offset: number) => new Date(2026, 8, 27 + offset);

function task(id: string, priority: number, dueDate: Date | null = null, created = 0) {
  return { id, priority, dueDate, createdAt: day(-30 + created) };
}

const ids = (tasks: Array<{ id: string }>) => tasks.map((t) => t.id);

describe("sortOpenForToday", () => {
  it("orders high, medium, low, then unprioritised", () => {
    const tasks = [task("none", 0), task("low", 1), task("high", 3), task("medium", 2)];
    expect(ids(sortOpenForToday(tasks, today, "local"))).toEqual([
      "high",
      "medium",
      "low",
      "none",
    ]);
  });

  it("puts priority ahead of an overdue date", () => {
    const tasks = [task("overdue-none", 0, day(-3)), task("undated-low", 1)];
    expect(ids(sortOpenForToday(tasks, today, "local"))).toEqual([
      "undated-low",
      "overdue-none",
    ]);
  });

  it("keeps the due-date order within one priority", () => {
    const tasks = [
      task("undated", 2, null, 0),
      task("next-week", 2, day(7)),
      task("overdue", 2, day(-1)),
      task("today", 2, day(0)),
    ];
    expect(ids(sortOpenForToday(tasks, today, "local"))).toEqual([
      "overdue",
      "today",
      "next-week",
      "undated",
    ]);
  });
});
