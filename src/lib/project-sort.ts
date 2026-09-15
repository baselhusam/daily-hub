import type { ProjectStatus } from "@/lib/status";

type Ranked = { status?: ProjectStatus };

/**
 * Active first, then paused, then done, in every list. Kept as a rank rather
 * than a filter so a parked or finished project stays reachable — it just
 * stops competing for attention with work that is still running.
 */
const STATUS_RANK: Record<ProjectStatus, number> = { ACTIVE: 0, PAUSED: 1, DONE: 2 };

function statusRank(project: Ranked) {
  return project.status ? STATUS_RANK[project.status] : 0;
}

export function sortProjectsByRecentActivity<
  T extends { updatedAt: Date; sortOrder: number } & Ranked
>(a: T, b: T) {
  return (
    statusRank(a) - statusRank(b) ||
    b.updatedAt.getTime() - a.updatedAt.getTime() ||
    a.sortOrder - b.sortOrder
  );
}

/** Manual (drag) order, with paused then done projects pinned to the bottom. */
export function sortProjectsByManualOrder<
  T extends { sortOrder: number } & Ranked
>(a: T, b: T) {
  return statusRank(a) - statusRank(b) || a.sortOrder - b.sortOrder;
}
