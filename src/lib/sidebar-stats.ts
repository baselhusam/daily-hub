import { startOfWeek } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getTodayDate, isScheduledOn } from "@/lib/dates";
import { getStreakInfo } from "@/lib/streak";
import { getSettings } from "@/lib/settings";

export type SidebarProject = {
  id: string;
  name: string;
  iconKey: string;
  logoUrl: string | null;
  color: string | null;
  openCount: number;
};

export type SidebarStats = {
  openTasks: number;
  projectCount: number;
  habitCount: number;
  completionsThisWeek: number;
  dailyConsistencyToday: number;
  projects: SidebarProject[];
  streak: number;
  streakDots: Array<{ color: string }>;
  showStreaks: boolean;
  hasNudges: boolean;
  settings: {
    displayName: string;
    role: string;
    workspaceName: string;
    showStreaks: boolean;
    nudgeDays: number;
  };
};

export async function getSidebarStats(): Promise<SidebarStats> {
  const today = getTodayDate();
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const settings = await getSettings();

  const [
    openTasks,
    completionsThisWeek,
    dailyTasks,
    todayDailyCompletions,
    projects,
    projectTaskCounts,
    habitCount,
  ] = await Promise.all([
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
        color: true,
      },
    }),
    prisma.task.groupBy({
      by: ["projectId"],
      where: { status: { not: "DONE" }, projectId: { not: null } },
      _count: { id: true },
    }),
    prisma.dailyTask.count({ where: { isActive: true } }),
  ]);

  const countMap = new Map(
    projectTaskCounts.map((row) => [row.projectId!, row._count.id])
  );

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

  const streakInfo = await getStreakInfo(dailyTasks);

  const overdueCount = await prisma.task.count({
    where: {
      status: { not: "DONE" },
      dueDate: { lt: today },
    },
  });

  return {
    openTasks,
    projectCount: projects.length,
    habitCount,
    completionsThisWeek,
    dailyConsistencyToday,
    projects: projects.map((project) => ({
      ...project,
      openCount: countMap.get(project.id) ?? 0,
    })),
    streak: streakInfo.streak,
    streakDots: streakInfo.dots,
    showStreaks: settings.showStreaks,
    hasNudges: overdueCount > 0,
    settings: {
      displayName: settings.displayName,
      role: settings.role,
      workspaceName: settings.workspaceName,
      showStreaks: settings.showStreaks,
      nudgeDays: settings.nudgeDays,
    },
  };
}
