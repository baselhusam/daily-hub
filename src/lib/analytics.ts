import { eachDayOfInterval, format, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getTodayDate, toDateOnlyString } from "@/lib/dates";
import { projectAccent } from "@/lib/entity-colors";
import { fallbackColorFor } from "@/lib/logo-color";
import { getSettings, type WeekStart } from "@/lib/settings";
import { withParsedWeekdays } from "@/lib/weekdays-db";
import {
  countsByDay,
  minutesByDay,
  periodDelta,
  sum,
  type AnalyticsDay,
  type AnalyticsEvent,
} from "@/lib/analytics-model";
import { completionKeys, consistency } from "@/lib/habit-stats";
import type { ProjectStatus } from "@/lib/status";

export { INBOX_ID } from "@/lib/analytics-model";

/** Enough for the 90-day range plus the period before it, for deltas. */
export const ANALYTICS_WINDOW_DAYS = 180;

export type AnalyticsProject = {
  id: string;
  name: string;
  color: string;
  logoUrl: string | null;
  iconKey: string;
  status: ProjectStatus;
  openCount: number;
  doneCount: number;
};

export type AnalyticsHabit = {
  id: string;
  title: string;
  iconKey: string;
  logoUrl: string | null;
  weekdays: number[];
  createdAtISO: string;
  isActive: boolean;
  color: string;
  /** Completed day keys (yyyy-MM-dd) inside the window. */
  completedOn: string[];
};

export type AnalyticsData = {
  todayISO: string;
  weekStartsOn: WeekStart;
  /** Oldest first, ending today. */
  days: AnalyticsDay[];
  events: AnalyticsEvent[];
  projects: AnalyticsProject[];
  habits: AnalyticsHabit[];
  /** A fixed 14-day headline for integrations (the MCP `get_stats` tool). */
  summary: AnalyticsSummary;
};

export type AnalyticsSummary = {
  rangeDays: number;
  tasksClosed: number;
  tasksClosedDelta: number | null;
  habitsKeptPct: number | null;
  focusMinutes: number;
  activeDays: number;
  openTasks: number;
  completedTasks: number;
  completionsByDay: Array<{ date: string; tasks: number; habits: number }>;
};

export async function getAnalyticsData(): Promise<AnalyticsData> {
  const today = getTodayDate();
  const todayKey = toDateOnlyString(today);
  const windowStart = subDays(today, ANALYTICS_WINDOW_DAYS - 1);
  const settings = await getSettings();

  const [logs, projects, habitRows, tasks, openTasks, completedTasks] = await Promise.all([
    prisma.completionLog.findMany({
      where: { completedOn: { gte: windowStart } },
      select: {
        completedOn: true,
        completedAt: true,
        entityType: true,
        entityId: true,
        minutes: true,
      },
    }),
    prisma.project.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        color: true,
        logoUrl: true,
        iconKey: true,
        status: true,
        tasks: { select: { status: true } },
      },
    }),
    prisma.dailyTask
      .findMany({ orderBy: { sortOrder: "asc" } })
      .then((rows) => rows.map(withParsedWeekdays)),
    prisma.task.findMany({ select: { id: true, projectId: true } }),
    prisma.task.count({ where: { status: { not: "DONE" } } }),
    prisma.task.count({ where: { status: "DONE" } }),
  ]);

  const projectByTask = new Map(tasks.map((task) => [task.id, task.projectId]));
  const days: AnalyticsDay[] = eachDayOfInterval({ start: windowStart, end: today }).map((day) => {
    const date = toDateOnlyString(day);
    return {
      date,
      label: format(day, "d MMM"),
      fullLabel: format(day, "EEEE, d MMMM"),
      weekday: day.getDay(),
      isToday: date === todayKey,
    };
  });

  const events: AnalyticsEvent[] = logs.map((log) => ({
    date: toDateOnlyString(log.completedOn),
    hour: log.completedAt ? log.completedAt.getHours() : null,
    kind: log.entityType === "TASK" ? "task" : "habit",
    projectId: log.entityType === "TASK" ? (projectByTask.get(log.entityId) ?? null) : null,
    entityId: log.entityId,
    minutes: log.entityType === "TASK" ? (log.minutes ?? 0) : 0,
  }));

  const habitLogs = logs.filter((log) => log.entityType === "DAILY_TASK");
  const keyMap = completionKeys(habitLogs);
  const habits: AnalyticsHabit[] = habitRows.map((row) => ({
    id: row.id,
    title: row.title,
    iconKey: row.iconKey,
    logoUrl: row.logoUrl,
    weekdays: row.weekdays,
    createdAtISO: row.createdAt.toISOString(),
    isActive: row.isActive,
    color: fallbackColorFor(row.id),
    completedOn: [...(keyMap.get(row.id) ?? [])],
  }));

  // The 14-day headline for integrations.
  const last14 = days.slice(-14);
  const last28 = days.slice(-28);
  const taskCounts28 = countsByDay(events, last28, (event) => event.kind === "task");
  const delta = periodDelta(taskCounts28, 14);
  const rated = habitRows
    .filter((row) => row.isActive)
    .map((row) => consistency(row, keyMap.get(row.id), today, 14).rate)
    .filter((rate): rate is number => rate !== null);
  const summary: AnalyticsSummary = {
    rangeDays: 14,
    tasksClosed: delta.recent,
    tasksClosedDelta: delta.pct,
    habitsKeptPct: rated.length ? Math.round(sum(rated) / rated.length) : null,
    focusMinutes: sum(minutesByDay(events, last14)),
    activeDays: countsByDay(events, last14, (event) => event.kind === "task").filter((count) => count > 0).length,
    openTasks,
    completedTasks,
    completionsByDay: last14.map((day) => ({
      date: day.date,
      tasks: events.filter((event) => event.date === day.date && event.kind === "task").length,
      habits: events.filter((event) => event.date === day.date && event.kind === "habit").length,
    })),
  };

  return {
    todayISO: today.toISOString(),
    weekStartsOn: settings.weekStartsOn,
    days,
    events,
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      color: projectAccent(project),
      logoUrl: project.logoUrl,
      iconKey: project.iconKey,
      status: project.status,
      openCount: project.tasks.filter((task) => task.status !== "DONE").length,
      doneCount: project.tasks.filter((task) => task.status === "DONE").length,
    })),
    habits,
    summary,
  };
}
