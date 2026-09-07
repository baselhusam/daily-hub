import { describe, expect, it } from "vitest";
import {
  buildProjectTrends,
  INBOX_SERIES_ID,
  type ProjectTrendInputProject,
  type TrendDay,
} from "@/lib/project-trends";

function mkDays(dates: string[]): TrendDay[] {
  return dates.map((date, index) => ({
    date,
    label: date,
    fullLabel: date,
    isToday: index === dates.length - 1,
  }));
}

function mkProject(
  overrides: Partial<ProjectTrendInputProject> & { id: string }
): ProjectTrendInputProject {
  return {
    name: overrides.id,
    color: null,
    logoUrl: null,
    iconKey: null,
    status: "ACTIVE",
    ...overrides,
  };
}

const days = mkDays(["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"]);

describe("buildProjectTrends", () => {
  it("aligns each series' daily array 1:1 with the day axis", () => {
    const trends = buildProjectTrends({
      days,
      projects: [mkProject({ id: "p1" })],
      taskProjectById: new Map([["t1", "p1"]]),
      logs: [
        { entityType: "TASK", entityId: "t1", completedOn: new Date("2026-01-01T12:00:00Z") },
        { entityType: "TASK", entityId: "t1", completedOn: new Date("2026-01-03T12:00:00Z") },
      ],
    });

    const p1 = trends.series.find((s) => s.id === "p1")!;
    expect(p1.daily).toHaveLength(days.length);
    expect(p1.daily).toEqual([1, 0, 1, 0]);
    expect(p1.total).toBe(2);
    expect(p1.lastActiveIndex).toBe(2);
  });

  it("ignores completions outside the day window", () => {
    const trends = buildProjectTrends({
      days,
      projects: [mkProject({ id: "p1" })],
      taskProjectById: new Map([["t1", "p1"]]),
      logs: [
        { entityType: "TASK", entityId: "t1", completedOn: new Date("2025-12-25T12:00:00Z") },
        { entityType: "TASK", entityId: "t1", completedOn: new Date("2026-02-01T12:00:00Z") },
      ],
    });

    const p1 = trends.series.find((s) => s.id === "p1")!;
    expect(p1.daily).toEqual([0, 0, 0, 0]);
    expect(p1.total).toBe(0);
    expect(p1.lastActiveIndex).toBe(-1);
  });

  it("routes unassigned tasks and habit check-ins into the inbox bucket", () => {
    const trends = buildProjectTrends({
      days,
      projects: [mkProject({ id: "p1" })],
      taskProjectById: new Map([
        ["t1", "p1"],
        ["t2", null],
      ]),
      logs: [
        { entityType: "TASK", entityId: "t2", completedOn: new Date("2026-01-02T12:00:00Z") },
        { entityType: "DAILY_TASK", entityId: "habit1", completedOn: new Date("2026-01-02T12:00:00Z") },
        // a task id never seen in taskProjectById also falls back to inbox
        { entityType: "TASK", entityId: "unknown", completedOn: new Date("2026-01-04T12:00:00Z") },
      ],
    });

    const inbox = trends.series.find((s) => s.id === INBOX_SERIES_ID)!;
    expect(inbox).toBeDefined();
    expect(inbox.daily).toEqual([0, 2, 0, 1]);
    expect(inbox.total).toBe(3);
    expect(inbox.name).toBe("Inbox & habits");

    const p1 = trends.series.find((s) => s.id === "p1")!;
    expect(p1.total).toBe(0);
  });

  it("uses a custom inbox label when provided", () => {
    const trends = buildProjectTrends({
      days,
      projects: [],
      taskProjectById: new Map(),
      logs: [{ entityType: "DAILY_TASK", entityId: "habit1", completedOn: new Date("2026-01-01T12:00:00Z") }],
      inboxLabel: "Unassigned",
    });

    const inbox = trends.series.find((s) => s.id === INBOX_SERIES_ID)!;
    expect(inbox.name).toBe("Unassigned");
  });

  it("sorts series by total descending, then by name", () => {
    const trends = buildProjectTrends({
      days,
      projects: [
        mkProject({ id: "low", name: "Zebra" }),
        mkProject({ id: "high", name: "Alpha" }),
        mkProject({ id: "tie-b", name: "Bravo" }),
        mkProject({ id: "tie-a", name: "Alpha Two" }),
      ],
      taskProjectById: new Map([
        ["t-low", "low"],
        ["t-high-1", "high"],
        ["t-high-2", "high"],
      ]),
      logs: [
        { entityType: "TASK", entityId: "t-low", completedOn: new Date("2026-01-01T12:00:00Z") },
        { entityType: "TASK", entityId: "t-high-1", completedOn: new Date("2026-01-01T12:00:00Z") },
        { entityType: "TASK", entityId: "t-high-2", completedOn: new Date("2026-01-02T12:00:00Z") },
      ],
    });

    const ids = trends.series.map((s) => s.id);
    // "high" (total 2) first, then the two zero-total ties ordered by name,
    // then "low" (total 1)... wait totals matter first: high=2, low=1, tie-a=0, tie-b=0
    expect(ids[0]).toBe("high");
    expect(ids[1]).toBe("low");
    expect(ids[2]).toBe("tie-a");
    expect(ids[3]).toBe("tie-b");
    expect(ids.at(-1)).toBe(INBOX_SERIES_ID);
  });

  it("computes maxCumulative as the largest running total across series", () => {
    const trends = buildProjectTrends({
      days,
      projects: [mkProject({ id: "p1" }), mkProject({ id: "p2" })],
      taskProjectById: new Map([
        ["t1", "p1"],
        ["t2", "p2"],
      ]),
      logs: [
        { entityType: "TASK", entityId: "t1", completedOn: new Date("2026-01-01T12:00:00Z") },
        { entityType: "TASK", entityId: "t1", completedOn: new Date("2026-01-02T12:00:00Z") },
        { entityType: "TASK", entityId: "t1", completedOn: new Date("2026-01-03T12:00:00Z") },
        { entityType: "TASK", entityId: "t2", completedOn: new Date("2026-01-01T12:00:00Z") },
      ],
    });

    // p1's running total peaks at 3 (its last day), p2's at 1 — max is 3.
    expect(trends.maxCumulative).toBe(3);
    expect(trends.maxDaily).toBe(1);
  });

  it("keeps a project with no logs present as an all-zero series", () => {
    const trends = buildProjectTrends({
      days,
      projects: [mkProject({ id: "silent" })],
      taskProjectById: new Map(),
      logs: [],
    });

    const silent = trends.series.find((s) => s.id === "silent")!;
    expect(silent.daily).toEqual([0, 0, 0, 0]);
    expect(silent.total).toBe(0);
    expect(silent.lastActiveIndex).toBe(-1);
  });

  it("excludes a DONE project with no completions in the window", () => {
    const trends = buildProjectTrends({
      days,
      projects: [mkProject({ id: "done-silent", status: "DONE" })],
      taskProjectById: new Map(),
      logs: [],
    });

    expect(trends.series.some((s) => s.id === "done-silent")).toBe(false);
  });

  it("includes a DONE project that has at least one completion in the window", () => {
    const trends = buildProjectTrends({
      days,
      projects: [mkProject({ id: "done-active", status: "DONE" })],
      taskProjectById: new Map([["t1", "done-active"]]),
      logs: [
        { entityType: "TASK", entityId: "t1", completedOn: new Date("2026-01-02T12:00:00Z") },
      ],
    });

    expect(trends.series.some((s) => s.id === "done-active")).toBe(true);
  });

  it("resolves a project's color via projectAccent (never null, even without a hex)", () => {
    const trends = buildProjectTrends({
      days,
      projects: [mkProject({ id: "no-color", color: null })],
      taskProjectById: new Map(),
      logs: [],
    });

    const series = trends.series.find((s) => s.id === "no-color")!;
    expect(series.color).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it("always includes the inbox series even with no habit or unassigned logs", () => {
    const trends = buildProjectTrends({
      days,
      projects: [mkProject({ id: "p1" })],
      taskProjectById: new Map(),
      logs: [],
    });

    expect(trends.series.some((s) => s.id === INBOX_SERIES_ID)).toBe(true);
  });
});
