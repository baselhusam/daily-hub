import type { ProjectStatus } from "@/lib/status";

type Ranked = { status?: ProjectStatus };

/**
 * Finished projects sink below live ones in every list. Kept as a rank rather
 * than a filter so a done project stays reachable — it just stops competing
 * for attention with work that is still running.
 */
function doneRank(project: Ranked) {
  return project.status === "DONE" ? 1 : 0;
}

export function sortProjectsByRecentActivity<
  T extends { updatedAt: Date; sortOrder: number } & Ranked
>(a: T, b: T) {
  return (
    doneRank(a) - doneRank(b) ||
    b.updatedAt.getTime() - a.updatedAt.getTime() ||
    a.sortOrder - b.sortOrder
  );
}

/** Manual (drag) order, with done projects pinned to the bottom. */
export function sortProjectsByManualOrder<
  T extends { sortOrder: number } & Ranked
>(a: T, b: T) {
  return doneRank(a) - doneRank(b) || a.sortOrder - b.sortOrder;
}
