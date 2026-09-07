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
  idleDaysSince,
} from "@/lib/notifications";
import {
  daysUntil,
  formatEstimate,
  mkSparkBars,
  type SparkBar,
} from "@/lib/streak";
import type { ProjectStatus, TaskStatus } from "@/lib/status";
import { withParsedWeekdays } from "@/lib/weekdays-db";
import { sortProjectsByRecentActivity } from "@/lib/project-sort";
import { calculateMomentumInfo, type MomentumInfo } from "@/lib/momentum";

export { sortProjectsByRecentActivity } from "@/lib/project-sort";

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

export type DashboardSnapshot = {
  label: string;
  value: string;
  unit: string;
  color: string;
  hint: string;
  hintColor: string;
  foot: string;
  bars?: SparkBar[];
  logoUrl?: string | null;
  iconKey?: string | null;
  entityName?: string;
  entityColor?: string | null;
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
    role: string;
    workspaceName: string;
    showStreaks: boolean;
    nudgeDays: number;
  };
  todayISO: string;
  todayLabel: string;
  greeting: string;
  projects: DashboardProject[];
  dailyTasks: DashboardDailyTask[];
  inboxTasks: DashboardTask[];
  snapshots: DashboardSnapshot[];
  momentum: MomentumInfo;
  activity: DashboardActivityPoint[];
  weekReview: {
    line: string;
    stats: Array<{ value: string; label: string }>;
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
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const settings = await getSettings();

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
  ] = await Promise.all([
    prisma.project.findMany({
      where: { status: { not: "DONE" } },
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
        completedOn: { gte: subDays(today, 7) },
      },
      select: { entityId: true, completedOn: true },
    }),
    prisma.completionLog.findMany({
      where: { completedOn: { gte: thisWeekStart } },
      select: { completedOn: true, entityType: true, entityId: true },
    }),
    prisma.completionLog.findMany({
      where: { completedOn: { gte: subDays(today, 89) } },
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
      select: { id: true, projectId: true, dueDate: true, createdAt: true },
    }),
    prisma.completionLog.findMany({
      where: { entityType: { in: ["TASK", "DAILY_TASK"] } },
      select: { entityType: true, entityId: true, completedOn: true },
    }),
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

  let nearest: {
    days: number;
    label: string;
    project: string;
    logoUrl: string | null;
    iconKey: string;
    color: string;
  } | null = null;
  for (const project of projects) {
    for (const milestone of project.milestones) {
      if (milestone.done || !milestone.dueDate) continue;
      const n = daysUntil(milestone.dueDate, today);
      if (n !== null && n >= 0 && (!nearest || n < nearest.days)) {
        nearest = {
          days: n,
          label: milestone.name,
          project: project.name,
          logoUrl: project.logoUrl,
          iconKey: project.iconKey,
          color: projectAccent(project),
        };
      }
    }
    if (project.dueDate) {
      const n = daysUntil(project.dueDate, today);
      if (n !== null && n >= 0 && (!nearest || n < nearest.days)) {
        nearest = {
          days: n,
          label: `${project.name} ships`,
          project: project.name,
          logoUrl: project.logoUrl,
          iconKey: project.iconKey,
          color: projectAccent(project),
        };
      }
    }
  }

  const back7Meta = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(today, 6 - i);
    return {
      date: toDateOnlyString(day),
      label: format(day, "d MMM"),
      fullLabel: format(day, "EEEE, d MMMM"),
    };
  });
  const doneSeries = back7Meta.map(
    ({ date }) =>
      activityCompletions.filter(
        (l) => toDateOnlyString(l.completedOn) === date && l.entityType === "TASK"
      ).length
  );
  const closed7 = doneSeries.reduce((sum, value) => sum + value, 0);
  const momentum = calculateMomentumInfo(
    dailyTasks,
    momentumTasks,
    momentumCompletions,
    today,
    365
  );

  const snapshots: DashboardSnapshot[] = [
    {
      label: "Open tasks",
      value: String(allOpenTasks.length),
      unit: "",
      color: "var(--foreground)",
      hint: overdueTasks.length
        ? `${overdueTasks.length} overdue`
        : "nothing overdue",
      hintColor: overdueTasks.length ? "var(--destructive)" : "var(--faint)",
      foot: closed7 === 1 ? "1 closed" : `${closed7} closed`,
      bars: mkSparkBars(doneSeries, 6, back7Meta),
    },
    {
      label: "Next deadline",
      value: nearest ? String(nearest.days) : "—",
      unit: nearest ? "days" : "",
      color: nearest ? "var(--signal)" : "var(--faint)",
      hint: nearest ? nearest.label : "no dated milestones",
      hintColor: "var(--faint)",
      foot: nearest ? nearest.project : "nothing scheduled",
      logoUrl: nearest?.logoUrl,
      iconKey: nearest?.iconKey,
      entityName: nearest?.project,
      entityColor: nearest?.color,
    },
  ];

  const activityByDay = new Map<string, { tasks: number; habits: number }>();
  for (const log of activityCompletions) {
    const key = toDateOnlyString(log.completedOn);
    const current = activityByDay.get(key) ?? { tasks: 0, habits: 0 };
    if (log.entityType === "TASK") current.tasks += 1;
    if (log.entityType === "DAILY_TASK") current.habits += 1;
    activityByDay.set(key, current);
  }
  const activity = Array.from({ length: 90 }, (_, index) => {
    const day = subDays(today, 89 - index);
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
  const byDay: Record<string, number> = {};
  for (const log of weekCompletions) {
    const key = toDateOnlyString(log.completedOn);
    byDay[key] = (byDay[key] ?? 0) + 1;
  }
  const bestKey = Object.keys(byDay).sort((a, b) => byDay[b] - byDay[a])[0];
  const bestDay = bestKey
    ? format(new Date(bestKey), "EEEE")
    : null;

  return {
    settings: {
      displayName: settings.displayName,
      role: settings.role,
      workspaceName: settings.workspaceName,
      showStreaks: settings.showStreaks,
      nudgeDays: settings.nudgeDays,
    },
    todayISO: today.toISOString(),
    todayLabel: formatTodayLabel(today),
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
      })),
      (task) => task.completedToday
    ),
    inboxTasks,
    snapshots,
    momentum,
    activity,
    weekReview: {
      line: weekCompletions.length
        ? `${weekCompletions.length} things done since Monday${bestDay ? `, best on ${bestDay}.` : "."}`
        : "Fresh week. Nothing logged yet.",
      stats: [
        { value: String(weekCompletions.length), label: "Completions" },
        { value: String(weekTaskCount), label: "Tasks" },
        {
          value: String(
            weekCompletions.filter((l) => l.entityType === "DAILY_TASK").length
          ),
          label: "Habits",
        },
      ],
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
    projects: projects.map((project) => {
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
        stalled: open > 0 && idle >= nudgeDays,
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
