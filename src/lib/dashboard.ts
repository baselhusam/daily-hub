import {
  format,
  startOfWeek,
  subDays,
} from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  formatWeekdays,
  formatTodayLabel,
  getGreeting,
  getTodayDate,
  groupCompletionDateKeys,
  isHabitDueOn,
  isOverdue,
  isScheduledOn,
  toDateOnlyString,
} from "@/lib/dates";
import { getDueMeta, isCompletedToday } from "@/lib/due-meta";
import { projectAccent } from "@/lib/entity-colors";
import { getSettings } from "@/lib/settings";
import { sortCompletedLast, sortInboxLog } from "@/lib/utils";
import {
  getProjectLastTouchMap,
  getStalledProjects,
  idleDaysSince,
} from "@/lib/notifications";
import { formatEstimate } from "@/lib/streak";
import {
  buildUpNext,
  habitDots,
  habitRate,
  habitsKeptThisWeek,
  milestonesDueWithin,
  oldestOverdueDays,
  openCountAt,
  openMixOf,
  weekReviewLine,
  type HabitDot,
  type OpenMix,
  type UpNextItem,
} from "@/lib/today-insights";
import type { ProjectStatus, TaskStatus } from "@/lib/status";
import { withParsedWeekdays } from "@/lib/weekdays-db";
import {
  sortProjectsByManualOrder,
  sortProjectsByRecentActivity,
} from "@/lib/project-sort";
import { calculateMomentumInfo, type MomentumInfo } from "@/lib/momentum";

export {
  sortProjectsByManualOrder,
  sortProjectsByRecentActivity,
} from "@/lib/project-sort";

/** Enough history for the 90-day closed chart plus its previous period. */
const ACTIVITY_DAYS = 180;

export type DashboardMilestone = {
  id: string;
  name: string;
  dueDate: Date | null;
  done: boolean;
};

export type DashboardTaskItem = {
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
  milestones: DashboardMilestone[];
  tasks: DashboardTaskItem[];
  openCount: number;
  doneCount: number;
};

export type DashboardDailyTask = {
  id: string;
  title: string;
  iconKey: string;
  logoUrl: string | null;
  weekdays: number[];
  sortOrder: number;
  completedToday: boolean;
  carriedOver: boolean;
  scheduleLabel: string;
  /** One cell per day for the trailing week, ending today. */
  dots: HabitDot[];
  /** Trailing-fortnight completion rate, null until the habit has history. */
  rate: number | null;
};

export type DashboardTask = {
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
  project: { id: string; name: string } | null;
  done: boolean;
  doneToday: boolean;
};

export type DashboardNudges = {
  overdue: { count: number; oldestDays: number };
  stalled: Array<{ id: string; name: string; idleDays: number }>;
  milestonesThisWeek: number;
};

export type DashboardActivityPoint = {
  date: string;
  label: string;
  fullLabel: string;
  tasks: number;
  habits: number;
  total: number;
  isToday: boolean;
};

export type DashboardData = {
  settings: {
    displayName: string;
    workspaceName: string;
    showStreaks: boolean;
    nudgeDays: number;
  };
  todayISO: string;
  todayLabel: string;
  /** "Thursday, September 10" — the Today page eyebrow. */
  todayEyebrow: string;
  greeting: string;
  projects: DashboardProject[];
  dailyTasks: DashboardDailyTask[];
  inboxTasks: DashboardTask[];
  openMix: OpenMix;
  /** Open tasks now minus open tasks a week ago. */
  openDelta: number;
  nudges: DashboardNudges;
  upNext: UpNextItem[];
  momentum: MomentumInfo;
  /** One point per day for the last 180 days, oldest first. */
  activity: DashboardActivityPoint[];
  weekReview: {
    line: string;
    closed: number;
    habitsKept: number;
    habitsTotal: number;
    focusMinutes: number;
  };
  stats: {
    openTasks: number;
    overdueTasks: number;
    dailyCompleted: number;
    dailyScheduled: number;
    completionsThisWeek: number;
    streak: number;
  };
};

function mapTaskItem(
  task: {
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
  },
  today: Date,
  completedTaskIdsToday: Set<string>
): DashboardTaskItem {
  return {
    ...task,
    done: task.status === "DONE",
    doneToday:
      task.status === "DONE" &&
      (isCompletedToday(task.completedAt, today) ||
        completedTaskIdsToday.has(task.id)),
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  const today = getTodayDate();
  const settings = await getSettings();
  const thisWeekStart = startOfWeek(today, { weekStartsOn: settings.weekStartsOn });

  const [
    projects,
    dailyTasks,
    inboxTasksRaw,
    todayCompletions,
    weekCompletions,
    activityCompletions,
    allOpenTasks,
    momentumTasks,
    momentumCompletions,
    lastTouch,
  ] = await Promise.all([
    // Done projects stay in the list — sortProjectsByRecentActivity drops them
    // to the bottom rather than hiding the work that was finished.
    prisma.project.findMany({
      orderBy: [{ updatedAt: "desc" }, { sortOrder: "asc" }],
      include: {
        milestones: { orderBy: { sortOrder: "asc" } },
        tasks: {
          orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { createdAt: "asc" }],
        },
      },
    }),
    prisma.dailyTask.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }).then((rows) => rows.map(withParsedWeekdays)),
    prisma.task.findMany({
      where: {
        projectId: null,
      },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { createdAt: "asc" }],
      include: {
        project: { select: { id: true, name: true } },
      },
    }),
    prisma.completionLog.findMany({
      where: {
        entityType: "DAILY_TASK",
        completedOn: { gte: subDays(today, 14) },
      },
      select: { entityId: true, completedOn: true },
    }),
    prisma.completionLog.findMany({
      where: { completedOn: { gte: thisWeekStart } },
      select: { completedOn: true, entityType: true, entityId: true, minutes: true },
    }),
    prisma.completionLog.findMany({
      where: { completedOn: { gte: subDays(today, ACTIVITY_DAYS - 1) } },
      select: { completedOn: true, entityType: true, entityId: true },
    }),
    prisma.task.findMany({
      where: { status: { not: "DONE" } },
      select: {
        id: true,
        title: true,
        dueDate: true,
        projectId: true,
        completedAt: true,
        status: true,
      },
    }),
    // Include every task so completed Inbox/project work without a due date can
    // still contribute to the day on which it was actually finished.
    prisma.task.findMany({
      select: {
        id: true,
        projectId: true,
        dueDate: true,
        createdAt: true,
        status: true,
        completedAt: true,
      },
    }),
    prisma.completionLog.findMany({
      where: { entityType: { in: ["TASK", "DAILY_TASK"] } },
      select: { entityType: true, entityId: true, completedOn: true },
    }),
    getProjectLastTouchMap(),
  ]);

  const todayKey = toDateOnlyString(today);
  const completedDailyIds = new Set(
    todayCompletions
      .filter((c) => toDateOnlyString(c.completedOn) === todayKey)
      .map((c) => c.entityId)
  );
  const completedTaskIdsToday = new Set(
    activityCompletions
      .filter(
        (log) =>
          log.entityType === "TASK" &&
          toDateOnlyString(log.completedOn) === todayKey
      )
      .map((log) => log.entityId)
  );
  const completionKeysByHabit = groupCompletionDateKeys(todayCompletions);
  const dueToday = dailyTasks.filter((task) =>
    isHabitDueOn(task.weekdays, today, {
      createdAt: task.createdAt,
      completedOnKeys: completionKeysByHabit.get(task.id),
    })
  );

  const mappedProjects: DashboardProject[] = projects
    .slice()
    .sort(sortProjectsByRecentActivity)
    .map((project) => {
    const openTasks = project.tasks.filter((t) => t.status !== "DONE");
    const doneCount = project.tasks.filter((t) => t.status === "DONE").length;
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      iconKey: project.iconKey,
      logoUrl: project.logoUrl,
      color: projectAccent(project),
      dueDate: project.dueDate,
      status: project.status,
      sortOrder: project.sortOrder,
      milestones: project.milestones,
      tasks: sortInboxLog(
        project.tasks.map((t) => mapTaskItem(t, today, completedTaskIdsToday))
      ),
      openCount: openTasks.length,
      doneCount,
    };
    });

  const inboxTasks: DashboardTask[] = sortInboxLog(
    inboxTasksRaw.map((task) => {
      const done = task.status === "DONE";
      return {
        ...task,
        done,
        doneToday:
          done &&
          (isCompletedToday(task.completedAt, today) ||
            completedTaskIdsToday.has(task.id)),
      };
    })
  );

  const overdueTasks = allOpenTasks.filter((t) => isOverdue(t.dueDate, today));

  const upNext = buildUpNext(
    projects.map((project) => ({
      id: project.id,
      name: project.name,
      color: projectAccent(project),
      status: project.status,
      dueDate: project.dueDate,
      milestones: project.milestones,
    })),
    today
  );
  const stalled = getStalledProjects(
    mappedProjects.map((project) => ({
      id: project.id,
      name: project.name,
      logoUrl: project.logoUrl,
      iconKey: project.iconKey,
      color: project.color,
      openCount: project.status === "DONE" ? 0 : project.openCount,
    })),
    lastTouch,
    today,
    settings.nudgeDays
  );
  const nudges: DashboardNudges = {
    overdue: {
      count: overdueTasks.length,
      oldestDays: oldestOverdueDays(allOpenTasks, today),
    },
    stalled: stalled.map((project) => ({
      id: project.id,
      name: project.name,
      idleDays: project.idleDays,
    })),
    milestonesThisWeek: milestonesDueWithin(
      projects.map((project) => ({
        id: project.id,
        name: project.name,
        color: "",
        status: project.status,
        dueDate: project.dueDate,
        milestones: project.milestones,
      })),
      today,
      7
    ),
  };
  const openDelta =
    allOpenTasks.length - openCountAt(momentumTasks, subDays(today, 7));

  const momentum = calculateMomentumInfo(
    dailyTasks,
    momentumTasks,
    momentumCompletions,
    today,
    365
  );

  const activityByDay = new Map<string, { tasks: number; habits: number }>();
  for (const log of activityCompletions) {
    const key = toDateOnlyString(log.completedOn);
    const current = activityByDay.get(key) ?? { tasks: 0, habits: 0 };
    if (log.entityType === "TASK") current.tasks += 1;
    if (log.entityType === "DAILY_TASK") current.habits += 1;
    activityByDay.set(key, current);
  }
  const activity = Array.from({ length: ACTIVITY_DAYS }, (_, index) => {
    const day = subDays(today, ACTIVITY_DAYS - 1 - index);
    const date = toDateOnlyString(day);
    const counts = activityByDay.get(date) ?? { tasks: 0, habits: 0 };
    return {
      date,
      label: format(day, "d MMM"),
      fullLabel: format(day, "EEEE, d MMMM"),
      tasks: counts.tasks,
      habits: counts.habits,
      total: counts.tasks + counts.habits,
      isToday: date === todayKey,
    };
  });

  const weekTaskCount = weekCompletions.filter(
    (l) => l.entityType === "TASK"
  ).length;
  const lastWeekStart = subDays(thisWeekStart, 7);
  const lastWeekTaskCount = activityCompletions.filter(
    (l) =>
      l.entityType === "TASK" &&
      l.completedOn >= lastWeekStart &&
      l.completedOn < thisWeekStart
  ).length;
  const weekHabits = habitsKeptThisWeek(
    dailyTasks,
    weekCompletions.filter((l) => l.entityType === "DAILY_TASK"),
    today,
    settings.weekStartsOn
  );
  const focusMinutes = weekCompletions.reduce(
    (sum, log) => sum + (log.entityType === "TASK" ? log.minutes ?? 0 : 0),
    0
  );

  return {
    settings: {
      displayName: settings.displayName,
      workspaceName: settings.workspaceName,
      showStreaks: settings.showStreaks,
      nudgeDays: settings.nudgeDays,
    },
    todayISO: today.toISOString(),
    todayLabel: formatTodayLabel(today),
    todayEyebrow: format(today, "EEEE, MMMM d"),
    greeting: getGreeting(settings.displayName),
    projects: mappedProjects,
    dailyTasks: sortCompletedLast(
      dueToday.map((task) => ({
        id: task.id,
        title: task.title,
        iconKey: task.iconKey,
        logoUrl: task.logoUrl,
        weekdays: task.weekdays,
        sortOrder: task.sortOrder,
        completedToday: completedDailyIds.has(task.id),
        carriedOver: !isScheduledOn(task.weekdays, today),
        scheduleLabel: formatWeekdays(task.weekdays),
        dots: habitDots(task, todayCompletions, today),
        rate: habitRate(task, todayCompletions, today),
      })),
      (task) => task.completedToday
    ),
    inboxTasks,
    openMix: openMixOf(allOpenTasks, today),
    openDelta,
    nudges,
    upNext,
    momentum,
    activity,
    weekReview: {
      line: weekReviewLine({
        closed: weekTaskCount,
        closedLastWeek: lastWeekTaskCount,
        habitsKept: weekHabits.kept,
        habitsTotal: weekHabits.total,
      }),
      closed: weekTaskCount,
      habitsKept: weekHabits.kept,
      habitsTotal: weekHabits.total,
      focusMinutes,
    },
    stats: {
      openTasks: allOpenTasks.length,
      overdueTasks: overdueTasks.length,
      dailyCompleted: dueToday.filter((t) =>
        completedDailyIds.has(t.id)
      ).length,
      dailyScheduled: dueToday.length,
      completionsThisWeek: weekCompletions.length,
      streak: momentum.streak,
    },
  };
}

export { getDueMeta, formatEstimate };

export async function getProjectsPageData() {
  const settings = await getSettings();
  const nudgeDays = settings.nudgeDays;
  const today = getTodayDate();

  const [projects, lastTouch] = await Promise.all([
    prisma.project.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        milestones: { orderBy: { sortOrder: "asc" } },
        tasks: { select: { status: true, id: true, projectId: true } },
      },
    }),
    getProjectLastTouchMap(),
  ]);

  return {
    todayISO: today.toISOString(),
    projects: projects.sort(sortProjectsByManualOrder).map((project) => {
      const open = project.tasks.filter((t) => t.status !== "DONE").length;
      const done = project.tasks.filter((t) => t.status === "DONE").length;
      const total = open + done;
      const pct = total === 0 ? 0 : Math.round((done / total) * 100);
      const last = lastTouch.get(project.id);
      const idle = idleDaysSince(last, today, 99);

      return {
        ...project,
        openCount: open,
        doneCount: done,
        completionPct: pct,
        stalled:
          project.status !== "DONE" && open > 0 && idle >= nudgeDays,
        idleDays: idle,
      };
    }),
  };
}

export async function getDailyPageData() {
  const today = getTodayDate();
  const windowStart = subDays(today, 13);

  const [dailyTasks, completions] = await Promise.all([
    prisma.dailyTask
      .findMany({
        orderBy: { sortOrder: "asc" },
      })
      .then((rows) => rows.map(withParsedWeekdays)),
    prisma.completionLog.findMany({
      where: {
        entityType: "DAILY_TASK",
        completedOn: { gte: windowStart },
      },
      select: { entityId: true, completedOn: true },
    }),
  ]);

  const days = Array.from({ length: 14 }, (_, i) => subDays(today, 13 - i));

  return {
    dailyTasks: dailyTasks.map((task) => {
      const scheduled = days.filter((day) =>
        isScheduledOn(task.weekdays, day)
      );
      const hits = scheduled.filter((day) =>
        completions.some(
          (c) =>
            c.entityId === task.id &&
            toDateOnlyString(c.completedOn) === toDateOnlyString(day)
        )
      );
      const rate =
        scheduled.length === 0
          ? 0
          : Math.round((hits.length / scheduled.length) * 100);

      const dots = days.map((day) => {
        if (!isScheduledOn(task.weekdays, day)) {
          return { color: "var(--chart-off)" };
        }
        const ok = completions.some(
          (c) =>
            c.entityId === task.id &&
            toDateOnlyString(c.completedOn) === toDateOnlyString(day)
        );
        const isToday = toDateOnlyString(day) === toDateOnlyString(today);
        return {
          color: ok
            ? isToday
              ? "var(--chart-hit)"
              : "var(--chart-hit-soft)"
            : "var(--track)",
        };
      });

      return {
        ...task,
        scheduleLabel: formatWeekdays(task.weekdays),
        rate,
        dots,
      };
    }),
  };
}
