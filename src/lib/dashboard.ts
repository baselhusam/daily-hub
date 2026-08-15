import { startOfWeek } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getTodayDate, isOverdue, isScheduledOn } from "@/lib/dates";
import type { EntityType, ProjectStatus, TaskStatus } from "@prisma/client";

export type DashboardProject = {
  id: string;
  name: string;
  description: string | null;
  iconKey: string;
  logoUrl: string | null;
  color: string | null;
  dueDate: Date | null;
  status: ProjectStatus;
  sortOrder: number;
  business: { id: string; name: string } | null;
  tasks: Array<{
    id: string;
    title: string;
    notes: string | null;
    status: TaskStatus;
    priority: number;
    dueDate: Date | null;
    completedAt: Date | null;
    projectId: string | null;
    businessId: string | null;
  }>;
};

export type DashboardDailyTask = {
  id: string;
  title: string;
  iconKey: string;
  logoUrl: string | null;
  weekdays: number[];
  businessId: string | null;
  sortOrder: number;
  completedToday: boolean;
};

export type DashboardTask = {
  id: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  priority: number;
  dueDate: Date | null;
  completedAt: Date | null;
  businessId: string | null;
  projectId: string | null;
  business: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
};

export type DashboardCompletion = {
  id: string;
  entityType: EntityType;
  entityId: string;
  completedAt: Date;
  completedOn: Date;
  title: string;
  iconKey: string;
};

export type DashboardBusiness = {
  id: string;
  name: string;
  slug: string;
  iconKey: string;
  logoUrl: string | null;
  color: string;
  sortOrder: number;
};

export type DashboardData = {
  businesses: DashboardBusiness[];
  projects: DashboardProject[];
  dailyTasks: DashboardDailyTask[];
  inboxTasks: DashboardTask[];
  completions: DashboardCompletion[];
  stats: {
    openTasks: number;
    overdueTasks: number;
    dailyCompleted: number;
    dailyScheduled: number;
    completionsThisWeek: number;
  };
};

export async function getDashboardData(): Promise<DashboardData> {
  const today = getTodayDate();
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });

  const [
    businesses,
    projects,
    dailyTasks,
    inboxTasks,
    completions,
    todayCompletions,
    completionsThisWeek,
  ] = await Promise.all([
    prisma.business.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        iconKey: true,
        logoUrl: true,
        color: true,
        sortOrder: true,
      },
    }),
    prisma.project.findMany({
      where: { status: { not: "DONE" } },
      orderBy: { sortOrder: "asc" },
      include: {
        business: { select: { id: true, name: true } },
        tasks: {
          where: { status: { not: "DONE" } },
          orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { createdAt: "asc" }],
        },
      },
    }),
    prisma.dailyTask.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.task.findMany({
      where: {
        status: { not: "DONE" },
        projectId: null,
      },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { createdAt: "asc" }],
      include: {
        business: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    }),
    prisma.completionLog.findMany({
      orderBy: { completedAt: "desc" },
      take: 20,
    }),
    prisma.completionLog.findMany({
      where: {
        entityType: "DAILY_TASK",
        completedOn: today,
      },
      select: { entityId: true },
    }),
    prisma.completionLog.count({
      where: { completedOn: { gte: thisWeekStart } },
    }),
  ]);

  const completedDailyIds = new Set(todayCompletions.map((c) => c.entityId));

  const scheduledToday = dailyTasks.filter((task) =>
    isScheduledOn(task.weekdays, today)
  );

  const dailyTaskMap = new Map(dailyTasks.map((task) => [task.id, task]));
  const inboxTaskMap = new Map(
    inboxTasks.map((task) => [task.id, { title: task.title, iconKey: "check" }])
  );

  const projectTaskMap = new Map(
    projects.flatMap((project) =>
      project.tasks.map((task) => [
        task.id,
        { title: task.title, iconKey: project.iconKey },
      ])
    )
  );

  const enrichedCompletions: DashboardCompletion[] = completions.map((log) => {
    if (log.entityType === "DAILY_TASK") {
      const daily = dailyTaskMap.get(log.entityId);
      return {
        id: log.id,
        entityType: log.entityType,
        entityId: log.entityId,
        completedAt: log.completedAt,
        completedOn: log.completedOn,
        title: daily?.title ?? "Daily task",
        iconKey: daily?.iconKey ?? "check",
      };
    }

    const inbox = inboxTaskMap.get(log.entityId);
    const project = projectTaskMap.get(log.entityId);
    return {
      id: log.id,
      entityType: log.entityType,
      entityId: log.entityId,
      completedAt: log.completedAt,
      completedOn: log.completedOn,
      title: inbox?.title ?? project?.title ?? "Task",
      iconKey: project?.iconKey ?? inbox?.iconKey ?? "check",
    };
  });

  const openProjectTasks = projects.reduce(
    (count, project) => count + project.tasks.length,
    0
  );
  const allOpenTasks = [...projects.flatMap((p) => p.tasks), ...inboxTasks];

  return {
    businesses,
    projects,
    dailyTasks: scheduledToday.map((task) => ({
      id: task.id,
      title: task.title,
      iconKey: task.iconKey,
      logoUrl: task.logoUrl,
      weekdays: task.weekdays,
      businessId: task.businessId,
      sortOrder: task.sortOrder,
      completedToday: completedDailyIds.has(task.id),
    })),
    inboxTasks,
    completions: enrichedCompletions,
    stats: {
      openTasks: openProjectTasks + inboxTasks.length,
      overdueTasks: allOpenTasks.filter((task) => isOverdue(task.dueDate, today))
        .length,
      dailyCompleted: scheduledToday.filter((task) =>
        completedDailyIds.has(task.id)
      ).length,
      dailyScheduled: scheduledToday.length,
      completionsThisWeek,
    },
  };
}

export async function getProjectsPageData() {
  const [projects, businesses] = await Promise.all([
    prisma.project.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        business: { select: { id: true, name: true } },
        _count: { select: { tasks: { where: { status: { not: "DONE" } } } } },
      },
    }),
    prisma.business.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return { projects, businesses };
}

export async function getDailyPageData() {
  const [dailyTasks, businesses] = await Promise.all([
    prisma.dailyTask.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        business: { select: { id: true, name: true } },
      },
    }),
    prisma.business.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return { dailyTasks, businesses };
}
