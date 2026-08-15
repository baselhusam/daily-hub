import { startOfWeek } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getTodayDate, isScheduledOn } from "@/lib/dates";

export type SidebarProject = {
  id: string;
  name: string;
  iconKey: string;
  logoUrl: string | null;
};

export type SidebarStats = {
  openTasks: number;
  completionsThisWeek: number;
  dailyConsistencyToday: number;
  projects: SidebarProject[];
};

export async function getSidebarStats(): Promise<SidebarStats> {
  const today = getTodayDate();
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });

  const [openTasks, completionsThisWeek, dailyTasks, todayDailyCompletions, projects] =
    await Promise.all([
      prisma.task.count({ where: { status: { not: "DONE" } } }),
      prisma.completionLog.count({
        where: { completedOn: { gte: thisWeekStart } },
      }),
      prisma.dailyTask.findMany({
        where: { isActive: true },
        select: { id: true, weekdays: true },
      }),
      prisma.completionLog.findMany({
        where: {
          entityType: "DAILY_TASK",
          completedOn: today,
        },
        select: { entityId: true },
      }),
      prisma.project.findMany({
        where: { status: { not: "DONE" } },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          iconKey: true,
          logoUrl: true,
        },
      }),
    ]);

  const scheduledToday = dailyTasks.filter((task) =>
    isScheduledOn(task.weekdays, today)
  );
  const completedIds = new Set(todayDailyCompletions.map((c) => c.entityId));

  const dailyConsistencyToday =
    scheduledToday.length === 0
      ? 0
      : Math.round(
          (scheduledToday.filter((task) => completedIds.has(task.id)).length /
            scheduledToday.length) *
            100
        );

  return {
    openTasks,
    completionsThisWeek,
    dailyConsistencyToday,
    projects,
  };
}
