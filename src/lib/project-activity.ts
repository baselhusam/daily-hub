import { prisma } from "@/lib/prisma";

/**
 * Records activity on the parent project when one of its child items changes.
 * Project.updatedAt is then the single source of truth for dashboard ordering.
 */
export async function touchProjects(
  projectIds: Array<string | null | undefined>
) {
  const ids = [...new Set(projectIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return;

  await prisma.project.updateMany({
    where: { id: { in: ids } },
    data: { updatedAt: new Date() },
  });
}
