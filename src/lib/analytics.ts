import { subDays, format, eachDayOfInterval } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getTodayDate } from "@/lib/dates";

export type AnalyticsOverview = {
  totalCompletions: number;
  completionsThisWeek: number;
  completionsLastWeek: number;
  weekChangePercent: number;
  openTasks: number;
  completedTasks: number;
  completionRate: number;
  dailyConsistencyToday: number;
  activeBusinesses: number;
  activeProjects: number;
  totalDailyTasks: number;
};

export type CompletionDayPoint = {
  date: string;
  label: string;
  tasks: number;
  daily: number;
  total: number;
};

export type BusinessAnalytics = {
  id: string;
  name: string;
  iconKey: string;
  color: string;
  openTasks: number;
  completedTasks: number;
  completions: number;
  projectCount: number;
};

export type ProjectAnalytics = {
  id: string;
  name: string;
  businessName: string;
  status: string;
  openTasks: number;
  completedTasks: number;
  completionRate: number;
};

export type DailyTaskAnalytics = {
  id: string;
  title: string;
  iconKey: string;
  completedDays: number;
  windowDays: number;
  rate: number;
};

export type AnalyticsData = {
  overview: AnalyticsOverview;
  completionsByDay: CompletionDayPoint[];
  byBusiness: BusinessAnalytics[];
  byProject: ProjectAnalytics[];
  dailyTaskStats: DailyTaskAnalytics[];
};

const ANALYTICS_WINDOW_DAYS = 14;
const DAILY_STATS_WINDOW = 7;

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getAnalyticsData(): Promise<AnalyticsData> {
  const today = getTodayDate();
  const windowStart = subDays(today, ANALYTICS_WINDOW_DAYS - 1);
  const dailyWindowStart = subDays(today, DAILY_STATS_WINDOW - 1);
  const thisWeekStart = startOfWeek(today);
  const lastWeekStart = subDays(thisWeekStart, 7);
  const lastWeekEnd = subDays(thisWeekStart, 1);

  const [
    allCompletions,
    windowCompletions,
    thisWeekCompletions,
    lastWeekCompletions,
    todayDailyCompletions,
    openTasksCount,
    completedTasksCount,
    businesses,
    projects,
    dailyTasks,
    dailyCompletionsInWindow,
  ] = await Promise.all([
    prisma.completionLog.count(),
    prisma.completionLog.findMany({
      where: { completedOn: { gte: windowStart } },
      select: { completedOn: true, entityType: true },
    }),
    prisma.completionLog.count({
      where: { completedOn: { gte: thisWeekStart } },
    }),
    prisma.completionLog.count({
      where: {
        completedOn: { gte: lastWeekStart, lte: lastWeekEnd },
      },
    }),
    prisma.completionLog.count({
      where: {
        entityType: "DAILY_TASK",
        completedOn: today,
      },
    }),
    prisma.task.count({ where: { status: { not: "DONE" } } }),
    prisma.task.count({ where: { status: "DONE" } }),
    prisma.business.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        projects: {
          include: {
            tasks: { select: { status: true } },
          },
        },
        tasks: { select: { status: true } },
      },
    }),
    prisma.project.findMany({
      include: {
        business: { select: { name: true } },
        tasks: { select: { status: true } },
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.dailyTask.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.completionLog.findMany({
      where: {
        entityType: "DAILY_TASK",
        completedOn: { gte: dailyWindowStart },
      },
      select: { entityId: true, completedOn: true },
    }),
  ]);

  const weekChangePercent =
    lastWeekCompletions === 0
      ? thisWeekCompletions > 0
        ? 100
        : 0
      : Math.round(
          ((thisWeekCompletions - lastWeekCompletions) / lastWeekCompletions) *
            100
        );

  const totalTaskPool = openTasksCount + completedTasksCount;
  const completionRate =
    totalTaskPool === 0
      ? 0
      : Math.round((completedTasksCount / totalTaskPool) * 100);

  const dailyConsistencyToday =
    dailyTasks.length === 0
      ? 0
      : Math.round((todayDailyCompletions / dailyTasks.length) * 100);

  const dayRange = eachDayOfInterval({ start: windowStart, end: today });
  const completionsByDay: CompletionDayPoint[] = dayRange.map((day) => {
    const dateKey = format(day, "yyyy-MM-dd");
    const dayLogs = windowCompletions.filter(
      (log) => format(log.completedOn, "yyyy-MM-dd") === dateKey
    );
    const tasks = dayLogs.filter((l) => l.entityType === "TASK").length;
    const daily = dayLogs.filter((l) => l.entityType === "DAILY_TASK").length;

    return {
      date: dateKey,
      label: format(day, "EEE"),
      tasks,
      daily,
      total: tasks + daily,
    };
  });

  const businessCompletionCounts = await prisma.completionLog.groupBy({
    by: ["entityId"],
    where: { entityType: "TASK" },
    _count: { id: true },
  });

  const taskBusinessMap = await prisma.task.findMany({
    where: { status: "DONE" },
    select: { id: true, businessId: true, project: { select: { businessId: true } } },
  });

  const taskToBusiness = new Map<string, string | null>();
  for (const task of taskBusinessMap) {
    taskToBusiness.set(
      task.id,
      task.businessId ?? task.project?.businessId ?? null
    );
  }

  const businessCompletionMap = new Map<string, number>();
  for (const row of businessCompletionCounts) {
    const businessId = taskToBusiness.get(row.entityId);
    if (businessId) {
      businessCompletionMap.set(
        businessId,
        (businessCompletionMap.get(businessId) ?? 0) + row._count.id
      );
    }
  }

  const byBusiness: BusinessAnalytics[] = businesses.map((business) => {
    const projectTasks = business.projects.flatMap((p) => p.tasks);
    const allTasks = [...business.tasks, ...projectTasks];
    const openTasks = allTasks.filter((t) => t.status !== "DONE").length;
    const completedTasks = allTasks.filter((t) => t.status === "DONE").length;

    return {
      id: business.id,
      name: business.name,
      iconKey: business.iconKey,
      color: business.color,
      openTasks,
      completedTasks,
      completions: businessCompletionMap.get(business.id) ?? 0,
      projectCount: business.projects.length,
    };
  });

  const byProject: ProjectAnalytics[] = projects.map((project) => {
    const openTasks = project.tasks.filter((t) => t.status !== "DONE").length;
    const completedTasks = project.tasks.filter((t) => t.status === "DONE").length;
    const total = openTasks + completedTasks;

    return {
      id: project.id,
      name: project.name,
      businessName: project.business.name,
      status: project.status,
      openTasks,
      completedTasks,
      completionRate: total === 0 ? 0 : Math.round((completedTasks / total) * 100),
    };
  });

  const dailyTaskStats: DailyTaskAnalytics[] = dailyTasks.map((task) => {
    const completedDays = dailyCompletionsInWindow.filter(
      (c) => c.entityId === task.id
    ).length;

    return {
      id: task.id,
      title: task.title,
      iconKey: task.iconKey,
      completedDays,
      windowDays: DAILY_STATS_WINDOW,
      rate: Math.round((completedDays / DAILY_STATS_WINDOW) * 100),
    };
  });

  const activeProjects = projects.filter((p) => p.status === "ACTIVE").length;

  return {
    overview: {
      totalCompletions: allCompletions,
      completionsThisWeek: thisWeekCompletions,
      completionsLastWeek: lastWeekCompletions,
      weekChangePercent,
      openTasks: openTasksCount,
      completedTasks: completedTasksCount,
      completionRate,
      dailyConsistencyToday,
      activeBusinesses: businesses.length,
      activeProjects,
      totalDailyTasks: dailyTasks.length,
    },
    completionsByDay,
    byBusiness,
    byProject,
    dailyTaskStats,
  };
}
