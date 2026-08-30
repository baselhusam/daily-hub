import { describe, expect, it } from "vitest";
import { sortProjectsByRecentActivity } from "@/lib/project-sort";

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
});
