import { describe, expect, it } from "vitest";
import { calculateMomentumInfo } from "@/lib/momentum";

const day = (offset: number) => new Date(2026, 8, 7 + offset);

describe("calculateMomentumInfo", () => {
  it("combines scheduled habits with inbox and project tasks due that day", () => {
    const info = calculateMomentumInfo(
      [
        {
          id: "habit",
          weekdays: [0, 1, 2, 3, 4, 5, 6],
          createdAt: day(-2),
        },
      ],
      [
        { id: "inbox-task", dueDate: day(0), createdAt: day(-1) },
        { id: "project-task", dueDate: day(0), createdAt: day(-1) },
      ],
      [
        { entityType: "DAILY_TASK", entityId: "habit", completedOn: day(-1) },
        { entityType: "TASK", entityId: "inbox-task", completedOn: day(0) },
        { entityType: "DAILY_TASK", entityId: "habit", completedOn: day(0) },
      ],
      day(0),
      2
    );

    expect(info.today).toMatchObject({ completed: 2, total: 3, ratio: 2 / 3 });
    expect(info.streak).toBe(1);
  });

  it("keeps a streak through neutral days without counting them", () => {
    const info = calculateMomentumInfo(
      [],
      [
        { id: "friday", dueDate: day(-2), createdAt: day(-2) },
        { id: "monday", dueDate: day(0), createdAt: day(-1) },
      ],
      [
        { entityType: "TASK", entityId: "friday", completedOn: day(-2) },
        { entityType: "TASK", entityId: "monday", completedOn: day(0) },
      ],
      day(0),
      3
    );

    expect(info.streak).toBe(2);
    expect(info.days[1]).toMatchObject({ total: 0, ratio: null });
  });

  it("counts a task created and due on the same day", () => {
    const info = calculateMomentumInfo(
      [],
      [
        {
          id: "same-day",
          dueDate: new Date(2026, 8, 7, 9),
          createdAt: new Date(2026, 8, 7, 15),
        },
      ],
      [{ entityType: "TASK", entityId: "same-day", completedOn: day(0) }],
      day(0),
      1
    );

    expect(info.today).toMatchObject({ completed: 1, total: 1, ratio: 1 });
  });

  it("counts completed Inbox and project work even when it has no due date", () => {
    const info = calculateMomentumInfo(
      [],
      [
        { id: "inbox-task", dueDate: null, createdAt: day(-2) },
        { id: "project-task", dueDate: null, createdAt: day(-2) },
      ],
      [
        { entityType: "TASK", entityId: "inbox-task", completedOn: day(-1) },
        { entityType: "TASK", entityId: "project-task", completedOn: day(0) },
      ],
      day(0),
      2
    );

    expect(info.days[0]).toMatchObject({ completed: 1, total: 1, ratio: 1 });
    expect(info.today).toMatchObject({ completed: 1, total: 1, ratio: 1 });
    expect(info.streak).toBe(2);
  });
});
