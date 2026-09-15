import { describe, expect, it } from "vitest";
import {
  buildUpNext,
  formatFocusHours,
  habitDots,
  habitRate,
  habitsKeptThisWeek,
  milestonesDueWithin,
  oldestOverdueDays,
  openCountAt,
  openMixOf,
  shipLabel,
  weekReviewLine,
} from "@/lib/today-insights";

// A Thursday, so "this week" spans Monday the 7th through today.
const today = new Date(2026, 8, 10);
const day = (offset: number) =>
  new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);

describe("openMixOf", () => {
  it("splits open tasks into overdue, due today and later", () => {
    const mix = openMixOf(
      [
        { dueDate: day(-4) },
        { dueDate: day(-1) },
        { dueDate: day(0) },
        { dueDate: day(3) },
        { dueDate: null },
      ],
      today
    );
    expect(mix).toEqual({ overdue: 2, dueToday: 1, later: 2 });
  });
});

describe("openCountAt", () => {
  it("counts tasks that existed and were still open at the end of the day", () => {
    const tasks = [
      { createdAt: day(-10), completedAt: null, status: "TODO" },
      { createdAt: day(-10), completedAt: day(-3), status: "DONE" },
      { createdAt: day(-10), completedAt: day(-9), status: "DONE" },
      { createdAt: day(-2), completedAt: null, status: "TODO" },
      { createdAt: day(-10), completedAt: null, status: "DONE" },
    ];
    expect(openCountAt(tasks, day(-7))).toBe(2);
    expect(openCountAt(tasks, today)).toBe(2);
  });
});

describe("oldestOverdueDays", () => {
  it("returns how far the most-slipped task has slipped", () => {
    expect(
      oldestOverdueDays([{ dueDate: day(-4) }, { dueDate: day(-1) }, { dueDate: day(2) }], today)
    ).toBe(4);
    expect(oldestOverdueDays([{ dueDate: day(1) }], today)).toBe(0);
  });
});

describe("buildUpNext", () => {
  const projects = [
    {
      id: "a",
      name: "Aurora",
      color: "#5F6DC6",
      status: "ACTIVE",
      dueDate: day(22),
      milestones: [
        { id: "m1", name: "Component pass", dueDate: day(5), done: false },
        { id: "m2", name: "Shipped bit", dueDate: day(1), done: true },
      ],
    },
    {
      id: "b",
      name: "Mobile",
      color: "#B8763C",
      status: "ACTIVE",
      dueDate: null,
      milestones: [{ id: "m3", name: "TestFlight", dueDate: day(-2), done: false }],
    },
    {
      id: "c",
      name: "Old",
      color: "#000000",
      status: "DONE",
      dueDate: day(1),
      milestones: [{ id: "m4", name: "Ignore me", dueDate: day(0), done: false }],
    },
  ];

  it("lists slipped and upcoming items soonest first, skipping done projects", () => {
    const next = buildUpNext(projects, today);
    expect(next.map((item) => [item.label, item.days])).toEqual([
      ["TestFlight", -2],
      ["Component pass", 5],
      ["Ships", 22],
    ]);
  });

  it("counts milestones due within the window", () => {
    expect(milestonesDueWithin(projects, today, 7)).toBe(1);
  });
});

describe("habitsKeptThisWeek", () => {
  const habits = [
    { id: "h1", weekdays: [1, 2, 3, 4, 5], createdAt: day(-60) },
    { id: "h2", weekdays: [1, 3], createdAt: day(-60) },
    { id: "h3", weekdays: [6], createdAt: day(-60) },
  ];

  it("keeps a habit only when every scheduled day so far was completed", () => {
    const completions = [
      // h1: Mon–Thu all done
      { entityId: "h1", completedOn: day(-3) },
      { entityId: "h1", completedOn: day(-2) },
      { entityId: "h1", completedOn: day(-1) },
      { entityId: "h1", completedOn: day(0) },
      // h2: Monday done, Wednesday missed
      { entityId: "h2", completedOn: day(-3) },
    ];
    expect(habitsKeptThisWeek(habits, completions, today)).toEqual({
      kept: 1,
      total: 2,
    });
  });

  it("does not count an unfinished today as a miss", () => {
    const completions = [
      { entityId: "h1", completedOn: day(-3) },
      { entityId: "h1", completedOn: day(-2) },
      { entityId: "h1", completedOn: day(-1) },
    ];
    expect(habitsKeptThisWeek(habits.slice(0, 1), completions, today)).toEqual({
      kept: 1,
      total: 1,
    });
  });
});

describe("habitDots / habitRate", () => {
  const habit = { id: "h1", weekdays: [1, 2, 3, 4, 5], createdAt: day(-60) };
  const completions = [
    { entityId: "h1", completedOn: day(-3) },
    { entityId: "h1", completedOn: day(-1) },
  ];

  it("marks each of the last seven days", () => {
    // Fri Sat Sun Mon Tue Wed Thu
    expect(habitDots(habit, completions, today)).toEqual([
      "miss",
      "off",
      "off",
      "hit",
      "miss",
      "hit",
      "today-open",
    ]);
  });

  it("rates the trailing window without counting today", () => {
    // 14 days back: 10 weekdays scheduled, 2 done.
    expect(habitRate(habit, completions, today)).toBe(20);
    expect(habitRate({ ...habit, weekdays: [] }, completions, today)).toBeNull();
  });
});

describe("weekReviewLine / formatFocusHours / shipLabel", () => {
  it("reads naturally in each trend direction", () => {
    expect(
      weekReviewLine({ closed: 34, closedLastWeek: 28, habitsKept: 5, habitsTotal: 6 })
    ).toBe("You closed 34 tasks and kept 5 of 6 habits — up from 28 last week.");
    expect(
      weekReviewLine({ closed: 1, closedLastWeek: 4, habitsKept: 0, habitsTotal: 0 })
    ).toBe("You closed 1 task — 3 fewer than last week.");
    expect(
      weekReviewLine({ closed: 0, closedLastWeek: 0, habitsKept: 0, habitsTotal: 0 })
    ).toBe("Fresh week. Nothing logged since Monday yet.");
  });

  it("formats focus time", () => {
    expect(formatFocusHours(0)).toBe("0h");
    expect(formatFocusHours(45)).toBe("45m");
    expect(formatFocusHours(690)).toBe("11.5h");
    expect(formatFocusHours(120)).toBe("2h");
  });

  it("describes a ship date relative to today", () => {
    expect(shipLabel(day(22), today)).toBe("ships Oct 2 · 22d");
    expect(shipLabel(day(0), today)).toBe("ships today");
    expect(shipLabel(day(-3), today)).toBe("ships Sep 7 · 3d late");
    expect(shipLabel(null, today)).toBeNull();
  });
});
