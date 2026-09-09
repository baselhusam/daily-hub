import { describe, expect, it } from "vitest";
import {
  sortProjectsByManualOrder,
  sortProjectsByRecentActivity,
} from "@/lib/project-sort";

describe("sortProjectsByRecentActivity", () => {
  it("puts the most recently changed project first", () => {
    const older = {
      updatedAt: new Date("2026-08-01T12:00:00Z"),
      sortOrder: 0,
    };
    const newer = {
      updatedAt: new Date("2026-08-02T12:00:00Z"),
      sortOrder: 1,
    };

    expect([older, newer].sort(sortProjectsByRecentActivity)).toEqual([
      newer,
      older,
    ]);
  });

  it("keeps the existing manual order when activity times match", () => {
    const laterInManualOrder = {
      updatedAt: new Date("2026-08-02T12:00:00Z"),
      sortOrder: 2,
    };
    const earlierInManualOrder = {
      updatedAt: new Date("2026-08-02T12:00:00Z"),
      sortOrder: 1,
    };

    expect(
      [laterInManualOrder, earlierInManualOrder].sort(
        sortProjectsByRecentActivity
      )
    ).toEqual([earlierInManualOrder, laterInManualOrder]);
  });

  it("sinks done projects below live ones however recent they are", () => {
    const justFinished = {
      updatedAt: new Date("2026-08-05T12:00:00Z"),
      sortOrder: 0,
      status: "DONE" as const,
    };
    const stale = {
      updatedAt: new Date("2026-07-01T12:00:00Z"),
      sortOrder: 1,
      status: "ACTIVE" as const,
    };

    expect([justFinished, stale].sort(sortProjectsByRecentActivity)).toEqual([
      stale,
      justFinished,
    ]);
  });
});

describe("sortProjectsByManualOrder", () => {
  it("keeps the drag order, with done projects last", () => {
    const done = { sortOrder: 0, status: "DONE" as const };
    const paused = { sortOrder: 2, status: "PAUSED" as const };
    const active = { sortOrder: 1, status: "ACTIVE" as const };

    expect([done, paused, active].sort(sortProjectsByManualOrder)).toEqual([
      active,
      paused,
      done,
    ]);
  });
});
