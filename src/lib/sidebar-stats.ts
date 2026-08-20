import { addDays, startOfWeek, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  getTodayDate,
  groupCompletionDateKeys,
  isHabitDueOn,
  toDateOnlyString,
} from "@/lib/dates";
import {
  buildNotifications,
  getProjectLastTouchMap,
  getStalledProjects,
  type AppNotification,
} from "@/lib/notifications";
import { withParsedWeekdays } from "@/lib/weekdays-db";
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
  inboxCount: number;
  projectCount: number;
  habitCount: number;
  completionsThisWeek: number;
  dailyConsistencyToday: number;
  projects: SidebarProject[];
  streak: number;
  streakDots: Array<{ color: string }>;
  showStreaks: boolean;
  notifications: AppNotification[];
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
    inboxCount,
    completionsThisWeek,
    dailyTasks,
    todayDailyCompletions,
    projects,
    projectTaskCounts,
    habitCount,
    overdueCount,
    dueTodayCount,
    lastTouch,
  ] = await Promise.all([
    prisma.task.count({ where: { status: { not: "DONE" } } }),
    prisma.task.count({
      where: { status: { not: "DONE" }, projectId: null },
    }),
    prisma.completionLog.count({
      where: { completedOn: { gte: thisWeekStart } },
    }),
    prisma.dailyTask.findMany({
      where: { isActive: true },
      select: { id: true, weekdays: true, createdAt: true },
    }).then((rows) => rows.map(withParsedWeekdays)),
    prisma.completionLog.findMany({
      where: {
        entityType: "DAILY_TASK",
        completedOn: { gte: subDays(today, 7) },
      },
      select: { entityId: true, completedOn: true },
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
    prisma.task.count({
      where: {
        status: { not: "DONE" },
        dueDate: { lt: today },
      },
    }),
    prisma.task.count({
      where: {
        status: { not: "DONE" },
        dueDate: { gte: today, lt: addDays(today, 1) },
      },
    }),
    getProjectLastTouchMap(),
  ]);

  const countMap = new Map(
    projectTaskCounts.map((row) => [row.projectId!, row._count.id])
  );

  const completedIds = new Set(
    todayDailyCompletions
      .filter((c) => toDateOnlyString(c.completedOn) === toDateOnlyString(today))
      .map((c) => c.entityId)
  );
  const completionKeysByHabit = groupCompletionDateKeys(todayDailyCompletions);
  const dueToday = dailyTasks.filter((task) =>
    isHabitDueOn(task.weekdays, today, {
      createdAt: task.createdAt,
      completedOnKeys: completionKeysByHabit.get(task.id),
    })
  );

  const dailyConsistencyToday =
    dueToday.length === 0
      ? 0
      : Math.round(
          (dueToday.filter((task) => completedIds.has(task.id)).length /
            dueToday.length) *
            100
        );

  const streakInfo = await getStreakInfo(dailyTasks);

  const remainingHabits = dueToday.filter(
    (task) => !completedIds.has(task.id)
  ).length;

  const notifications = buildNotifications({
    overdueCount,
    dueTodayCount,
    remainingHabits,
    nudgeDays: settings.nudgeDays,
    stalled: getStalledProjects(
      projects.map((project) => ({
        ...project,
        openCount: countMap.get(project.id) ?? 0,
      })),
      lastTouch,
      today,
      settings.nudgeDays
    ),
  });

  return {
    openTasks,
    inboxCount,
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
    notifications,
    settings: {
      displayName: settings.displayName,
      role: settings.role,
      workspaceName: settings.workspaceName,
      showStreaks: settings.showStreaks,
      nudgeDays: settings.nudgeDays,
    },
  };
}
