import { describe, expect, it } from "vitest";
import { getStalledProjects } from "@/lib/notifications";

const today = new Date(2026, 8, 15);

const longAgo = new Date(2026, 0, 1);

function project(id: string, status: string, openCount = 3, createdAt = longAgo) {
  return { id, name: id, logoUrl: null, iconKey: "folder", color: null, status, openCount, createdAt };
}

describe("getStalledProjects", () => {
  it("flags only active projects with open work that have gone quiet", () => {
    const lastTouch = new Map([
      ["active", "2026-09-01"],
      ["paused", "2026-09-01"],
      ["done", "2026-09-01"],
      ["fresh", "2026-09-14"],
    ]);
    const stalled = getStalledProjects(
      [
        project("active", "ACTIVE"),
        project("paused", "PAUSED"),
        project("done", "DONE"),
        project("fresh", "ACTIVE"),
        project("empty", "ACTIVE", 0),
      ],
      lastTouch,
      today,
      7
    );
    expect(stalled.map((p) => p.id)).toEqual(["active"]);
    expect(stalled[0].idleDays).toBeGreaterThanOrEqual(13);
  });

  it("counts a never-touched project's idle time from its creation", () => {
    const fresh = project("fresh", "ACTIVE", 3, new Date(2026, 8, 13));
    const old = project("old", "ACTIVE", 3, new Date(2026, 8, 1));
    const stalled = getStalledProjects([fresh, old], new Map(), today, 7);
    expect(stalled.map((p) => p.id)).toEqual(["old"]);
    expect(stalled[0].idleDays).toBe(14);
    expect(stalled[0].lastTouch).toBeUndefined();
  });
});
