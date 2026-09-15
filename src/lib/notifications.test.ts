import { describe, expect, it } from "vitest";
import { getStalledProjects } from "@/lib/notifications";

const today = new Date(2026, 8, 15);

function project(id: string, status: string, openCount = 3) {
  return { id, name: id, logoUrl: null, iconKey: "folder", color: null, status, openCount };
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

  it("treats a never-touched active project as stalled", () => {
    const stalled = getStalledProjects([project("new", "ACTIVE")], new Map(), today, 7);
    expect(stalled).toHaveLength(1);
    expect(stalled[0].idleDays).toBe(8);
  });
});
