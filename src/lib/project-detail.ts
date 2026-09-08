import { eachDayOfInterval, format, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getTodayDate, isOverdue, toDateOnlyString } from "@/lib/dates";
import { isCompletedToday } from "@/lib/due-meta";
import { projectAccent } from "@/lib/entity-colors";
import { idleDaysSince } from "@/lib/notifications";
import { getSettings } from "@/lib/settings";
import type { ProjectStatus, TaskStatus } from "@/lib/status";

/**
 * The detail page keeps its own 90-day window so the range switcher can slice
 * 14/30/90 out of a single payload. Everything above the chart is computed
 * over the project's whole life, not the window — a project's "42 done" should
 * not shrink because you narrowed the chart.
 */
const DETAIL_WINDOW_DAYS = 90;

export type ProjectDetailTask = {
  id: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  priority: number;
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  estimatedMinutes: number | null;
  projectId: string | null;
  done: boolean;
  doneToday: boolean;
};

export type ProjectDetailMilestone = {
  id: string;
  name: string;
  dueDate: Date | null;
  done: boolean;
};

export type ProjectDetailActivityPoint = {
  date: string;
  label: string;
  fullLabel: string;
  count: number;
  isToday: boolean;
};

export type ProjectDetailWeekday = {
  id: number;
  label: string;
  name: string;
  count: number;
  barHeight: number;
  isBest: boolean;
};

export type ProjectDetailStats = {
  openCount: number;
  doneCount: number;
  totalCount: number;
  completionPct: number;
  overdueCount: number;
  milestonesDone: number;
  milestonesTotal: number;
  focusMinutes: number;
  windowCompletions: number;
  perWeek: number;
  idleDays: number;
  lastActiveDate: string | null;
  stalled: boolean;
  ageDays: number;
};

export type ProjectDetailData = {
  todayISO: string;
  project: {
    id: string;
    name: string;
    description: string | null;
    iconKey: string;
    logoUrl: string | null;
    color: string;
    /** The stored value, so the edit dialog can tell auto from manual. */
    rawColor: string | null;
    colorSource: "auto" | "manual";
    dueDate: Date | null;
    status: ProjectStatus;
    createdAt: Date;
  };
  milestones: ProjectDetailMilestone[];
  tasks: ProjectDetailTask[];
  stats: ProjectDetailStats;
  activity: ProjectDetailActivityPoint[];
  weekdays: ProjectDetailWeekday[];
  /** Every project, so the "Add task" dialog can still re-file a task. */
  projectOptions: Array<{
    id: string;
    name: string;
    iconKey: string;
    logoUrl: string | null;
    color: string | null;
  }>;
};

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Monday-first, matching the rest of the app's week. */
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export async function getProjectDetailData(
  projectId: string
): Promise<ProjectDetailData | null> {
  const today = getTodayDate();
  const todayKey = toDateOnlyString(today);
  const windowStart = subDays(today, DETAIL_WINDOW_DAYS - 1);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      milestones: { orderBy: { sortOrder: "asc" } },
      tasks: {
        orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!project) return null;

  const settings = await getSettings();
  const taskIds = project.tasks.map((task) => task.id);

  // Two reads: everything ever logged for this project's tasks (for focus
  // minutes and last-touch), and nothing at all when the project has no tasks.
  const logs = taskIds.length
    ? await prisma.completionLog.findMany({
        where: { entityType: "TASK", entityId: { in: taskIds } },
        select: { entityId: true, completedOn: true, minutes: true },
      })
    : [];

  const projectOptions = await prisma.project.findMany({
    where: { status: { not: "DONE" } },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      iconKey: true,
      logoUrl: true,
      color: true,
    },
  });

  const completedTodayIds = new Set(
    logs
      .filter((log) => toDateOnlyString(log.completedOn) === todayKey)
      .map((log) => log.entityId)
  );

  const tasks: ProjectDetailTask[] = project.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    notes: task.notes,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    completedAt: task.completedAt,
    createdAt: task.createdAt,
    estimatedMinutes: task.estimatedMinutes,
    projectId: task.projectId,
    done: task.status === "DONE",
    doneToday:
      task.status === "DONE" &&
      (isCompletedToday(task.completedAt, today) ||
        completedTodayIds.has(task.id)),
  }));

  const openTasks = tasks.filter((task) => !task.done);
  const doneCount = tasks.length - openTasks.length;
  const totalCount = tasks.length;
  const completionPct =
    totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);
  const overdueCount = openTasks.filter((task) =>
    isOverdue(task.dueDate, today)
  ).length;

  const countByDate = new Map<string, number>();
  let focusMinutes = 0;
  let lastActiveDate: string | null = null;
  for (const log of logs) {
    const key = toDateOnlyString(log.completedOn);
    countByDate.set(key, (countByDate.get(key) ?? 0) + 1);
    focusMinutes += log.minutes ?? 0;
    if (!lastActiveDate || key > lastActiveDate) lastActiveDate = key;
  }

  const dayRange = eachDayOfInterval({ start: windowStart, end: today });
  const activity: ProjectDetailActivityPoint[] = dayRange.map((day) => {
    const date = toDateOnlyString(day);
    return {
      date,
      label: format(day, "d MMM"),
      fullLabel: format(day, "EEEE, d MMMM"),
      count: countByDate.get(date) ?? 0,
      isToday: date === todayKey,
    };
  });

  const windowCompletions = activity.reduce(
    (sum, point) => sum + point.count,
    0
  );

  const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
  const weekdayDays = [0, 0, 0, 0, 0, 0, 0];
  for (const day of dayRange) {
    const dow = day.getDay();
    weekdayTotals[dow] += countByDate.get(toDateOnlyString(day)) ?? 0;
    weekdayDays[dow] += 1;
  }
  const weekdayAverages = weekdayTotals.map((total, index) =>
    weekdayDays[index] ? total / weekdayDays[index] : 0
  );
  const weekdayMax = Math.max(...weekdayAverages);
  const bestWeekday = WEEKDAY_ORDER.reduce((best, index) =>
    weekdayAverages[index] > weekdayAverages[best] ? index : best
  , WEEKDAY_ORDER[0]);

  const weekdays: ProjectDetailWeekday[] = WEEKDAY_ORDER.map((index) => ({
    id: index,
    label: WEEKDAY_LABELS[index],
    name: WEEKDAY_NAMES[index],
    count: Math.round(weekdayAverages[index] * 10) / 10,
    barHeight:
      weekdayMax > 0
        ? Math.max(3, Math.round((weekdayAverages[index] / weekdayMax) * 100))
        : 3,
    // With nothing logged every day ties at zero — don't crown one of them.
    isBest: weekdayMax > 0 && index === bestWeekday,
  }));

  const idleDays = idleDaysSince(lastActiveDate ?? undefined, today, 99);
  const ageDays = Math.max(
    1,
    Math.floor((today.getTime() - project.createdAt.getTime()) / 86400000)
  );

  return {
    todayISO: today.toISOString(),
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      iconKey: project.iconKey,
      logoUrl: project.logoUrl,
      color: projectAccent(project),
      rawColor: project.color,
      colorSource: project.colorSource === "manual" ? "manual" : "auto",
      dueDate: project.dueDate,
      status: project.status,
      createdAt: project.createdAt,
    },
    milestones: project.milestones.map((milestone) => ({
      id: milestone.id,
      name: milestone.name,
      dueDate: milestone.dueDate,
      done: milestone.done,
    })),
    tasks,
    stats: {
      openCount: openTasks.length,
      doneCount,
      totalCount,
      completionPct,
      overdueCount,
      milestonesDone: project.milestones.filter((m) => m.done).length,
      milestonesTotal: project.milestones.length,
      focusMinutes,
      windowCompletions,
      perWeek:
        Math.round((windowCompletions / DETAIL_WINDOW_DAYS) * 7 * 10) / 10,
      idleDays,
      lastActiveDate,
      stalled: openTasks.length > 0 && idleDays >= settings.nudgeDays,
      ageDays,
    },
    activity,
    weekdays,
    projectOptions,
  };
}
