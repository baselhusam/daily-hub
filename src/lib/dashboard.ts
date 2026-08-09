import { prisma } from "@/lib/prisma";
import { getTodayDate } from "@/lib/dates";
import type { EntityType, ProjectStatus, TaskStatus } from "@prisma/client";

export type DashboardBusiness = {
  id: string;
  name: string;
  slug: string;
  iconKey: string;
  logoUrl: string | null;
  color: string;
  sortOrder: number;
  projects: Array<{
    id: string;
    name: string;
    description: string | null;
    iconKey: string;
    color: string | null;
    status: ProjectStatus;
    sortOrder: number;
    tasks: Array<{
      id: string;
      title: string;
      notes: string | null;
      status: TaskStatus;
      priority: number;
      completedAt: Date | null;
      projectId: string | null;
      businessId: string | null;
    }>;
  }>;
};

export type DashboardDailyTask = {
  id: string;
  title: string;
  iconKey: string;
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

export type DashboardData = {
  businesses: DashboardBusiness[];
  dailyTasks: DashboardDailyTask[];
  inboxTasks: DashboardTask[];
  completions: DashboardCompletion[];
  stats: {
    openTasks: number;
    dailyCompleted: number;
    dailyTotal: number;
  };
};

export async function getDashboardData(): Promise<DashboardData> {
  const today = getTodayDate();

  const [businesses, dailyTasks, inboxTasks, completions, todayCompletions] =
    await Promise.all([
      prisma.business.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
          projects: {
            where: { status: { not: "DONE" } },
            orderBy: { sortOrder: "asc" },
            include: {
              tasks: {
                where: { status: { not: "DONE" } },
                orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
              },
            },
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
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
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
    ]);

  const completedDailyIds = new Set(todayCompletions.map((c) => c.entityId));

  const dailyTaskMap = new Map(dailyTasks.map((task) => [task.id, task]));
  const inboxTaskMap = new Map(
    inboxTasks.map((task) => [task.id, { title: task.title, iconKey: "check" }])
  );

  const businessProjectTasks = businesses.flatMap((business) =>
    business.projects.flatMap((project) =>
      project.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        iconKey: project.iconKey,
      }))
    )
  );
  const projectTaskMap = new Map(
    businessProjectTasks.map((task) => [task.id, task])
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

  const openProjectTasks = businesses.reduce(
    (count, business) =>
      count +
      business.projects.reduce(
        (projectCount, project) => projectCount + project.tasks.length,
        0
      ),
    0
  );

  return {
    businesses,
    dailyTasks: dailyTasks.map((task) => ({
      id: task.id,
      title: task.title,
      iconKey: task.iconKey,
      businessId: task.businessId,
      sortOrder: task.sortOrder,
      completedToday: completedDailyIds.has(task.id),
    })),
    inboxTasks,
    completions: enrichedCompletions,
    stats: {
      openTasks: openProjectTasks + inboxTasks.length,
      dailyCompleted: completedDailyIds.size,
      dailyTotal: dailyTasks.length,
    },
  };
}
