import { prisma } from "@/lib/prisma";
import { formatDueDate, formatWeekdays, getTodayDate } from "@/lib/dates";
import { isCompletedToday } from "@/lib/due-meta";

export type SearchProject = {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  iconKey: string;
  color: string | null;
  status: "ACTIVE" | "PAUSED" | "DONE";
  openCount: number;
  dueLabel: string | null;
};

export type SearchTask = {
  id: string;
  title: string;
  notes: string | null;
  status: "TODO" | "DOING" | "DONE";
  dueLabel: string | null;
  visibleOnToday: boolean;
  projectId: string | null;
  project: {
    id: string;
    name: string;
    logoUrl: string | null;
    iconKey: string;
    color: string | null;
  } | null;
};

export type SearchHabit = {
  id: string;
  title: string;
  logoUrl: string | null;
  iconKey: string;
  scheduleLabel: string;
  isActive: boolean;
};

export type SearchMilestone = {
  id: string;
  name: string;
  done: boolean;
  dueLabel: string | null;
  project: {
    id: string;
    name: string;
    logoUrl: string | null;
    iconKey: string;
    color: string | null;
    status: "ACTIVE" | "PAUSED" | "DONE";
  };
};

export type SearchIndex = {
  projects: SearchProject[];
  tasks: SearchTask[];
  milestones: SearchMilestone[];
  habits: SearchHabit[];
};

const PROJECT_STATUS_RANK: Record<SearchProject["status"], number> = {
  ACTIVE: 0,
  PAUSED: 1,
  DONE: 2,
};

export async function getSearchIndex(): Promise<SearchIndex> {
  const today = getTodayDate();

  const [projects, tasks, milestones, habits] = await Promise.all([
    prisma.project.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        logoUrl: true,
        iconKey: true,
        color: true,
        status: true,
        dueDate: true,
        sortOrder: true,
        _count: {
          select: { tasks: { where: { status: { not: "DONE" } } } },
        },
      },
    }),
    prisma.task.findMany({
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        title: true,
        notes: true,
        status: true,
        dueDate: true,
        completedAt: true,
        projectId: true,
        project: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            iconKey: true,
            color: true,
          },
        },
      },
    }),
    prisma.milestone.findMany({
      orderBy: [{ done: "asc" }, { sortOrder: "asc" }],
      select: {
        id: true,
        name: true,
        done: true,
        dueDate: true,
        project: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            iconKey: true,
            color: true,
            status: true,
          },
        },
      },
    }),
    prisma.dailyTask.findMany({
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }],
      select: {
        id: true,
        title: true,
        logoUrl: true,
        iconKey: true,
        weekdays: true,
        isActive: true,
      },
    }),
  ]);

  return {
    projects: projects
      .slice()
      .sort(
        (a, b) =>
          PROJECT_STATUS_RANK[a.status] - PROJECT_STATUS_RANK[b.status] ||
          a.sortOrder - b.sortOrder
      )
      .map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        logoUrl: project.logoUrl,
        iconKey: project.iconKey,
        color: project.color,
        status: project.status,
        openCount: project._count.tasks,
        dueLabel: project.dueDate ? formatDueDate(project.dueDate) : null,
      })),
    tasks: tasks
      .slice()
      .sort((a, b) => Number(a.status === "DONE") - Number(b.status === "DONE"))
      .map((task) => ({
        id: task.id,
        title: task.title,
        notes: task.notes,
        status: task.status,
        dueLabel: task.dueDate ? formatDueDate(task.dueDate) : null,
        visibleOnToday:
          task.status !== "DONE" || isCompletedToday(task.completedAt, today),
        projectId: task.projectId,
        project: task.project,
      })),
    milestones: milestones.map((milestone) => ({
      id: milestone.id,
      name: milestone.name,
      done: milestone.done,
      dueLabel: milestone.dueDate ? formatDueDate(milestone.dueDate) : null,
      project: milestone.project,
    })),
    habits: habits.map((habit) => ({
      id: habit.id,
      title: habit.title,
      logoUrl: habit.logoUrl,
      iconKey: habit.iconKey,
      scheduleLabel: formatWeekdays(habit.weekdays),
      isActive: habit.isActive,
    })),
  };
}
