export function sortProjectsByRecentActivity<
  T extends { updatedAt: Date; sortOrder: number }
>(a: T, b: T) {
  return b.updatedAt.getTime() - a.updatedAt.getTime() || a.sortOrder - b.sortOrder;
}
