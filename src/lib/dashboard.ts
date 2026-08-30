import {
  addDays,
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
import { getSettings } from "@/lib/settings";
import { sortCompletedLast, sortInboxLog } from "@/lib/utils";
import {
  getProjectLastTouchMap,
  idleDaysSince,
} from "@/lib/notifications";
import {
  daysUntil,
  formatEstimate,
  getStreakInfo,
  mkSparkBars,
  type SparkBar,
} from "@/lib/streak";
import type { ProjectStatus, TaskStatus } from "@/lib/status";
import { withParsedWeekdays } from "@/lib/weekdays-db";
import { sortProjectsByRecentActivity } from "@/lib/project-sort";

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
    last14Completions,
    streakInfo,
    allOpenTasks,
  ] = await Promise.all([
    prisma.project.findMany({
      where: { status: { not: "DONE" } },
      orderBy: [{ updatedAt: "desc" }, { sortOrder: "asc" }],
      include: {
        milestones: { orderBy: { sortOrder: "asc" } },
        tasks: {
          where: {
            OR: [
              { status: { not: "DONE" } },
              { completedAt: { gte: today } },
            ],
          },
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
      where: { completedOn: { gte: subDays(today, 13) } },
      select: { completedOn: true, entityType: true, entityId: true },
    }),
    getStreakInfo(),
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
  ]);

  const todayKey = toDateOnlyString(today);
  const completedDailyIds = new Set(
    todayCompletions
      .filter((c) => toDateOnlyString(c.completedOn) === todayKey)
      .map((c) => c.entityId)
  );
  const completedTaskIdsToday = new Set(
    last14Completions
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
      color: project.color,
      dueDate: project.dueDate,
      status: project.status,
      sortOrder: project.sortOrder,
      milestones: project.milestones,
      tasks: sortCompletedLast(
        project.tasks.map((t) => mapTaskItem(t, today, completedTaskIdsToday)),
        (task) => task.doneToday
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
  const dueThisWeek = allOpenTasks.filter((t) => {
    const days = daysUntil(t.dueDate, today);
    return days !== null && days >= 0 && days <= 6;
  });

  let nearest: {
    days: number;
    label: string;
    project: string;
    logoUrl: string | null;
    iconKey: string;
    color: string | null;
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
          color: project.color,
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
          color: project.color,
        };
      }
    }
  }

  const back7 = Array.from({ length: 7 }, (_, i) =>
    toDateOnlyString(subDays(today, 6 - i))
  );
  const fwd7 = Array.from({ length: 7 }, (_, i) =>
    toDateOnlyString(addDays(today, i))
  );

  const doneSeries = back7.map(
    (key) =>
      last14Completions.filter(
        (l) => toDateOnlyString(l.completedOn) === key && l.entityType === "TASK"
      ).length
  );
  const habitSeries = back7.map((key) => {
    const day = new Date(key);
    return dailyTasks.filter((h) => isScheduledOn(h.weekdays, day)).length > 0
      ? last14Completions.filter(
          (l) =>
            l.entityType === "DAILY_TASK" &&
            toDateOnlyString(l.completedOn) === key
        ).length
      : 0;
  });
  const dueSeries = fwd7.map(
    (key) =>
      allOpenTasks.filter(
        (t) => t.dueDate && toDateOnlyString(t.dueDate) === key
      ).length
  );

  const closed7 = doneSeries.reduce((sum, value) => sum + value, 0);
  const hits7 = habitSeries.reduce((sum, value) => sum + value, 0);
  const dueTodayCount = dueSeries[0] ?? 0;

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
      bars: mkSparkBars(doneSeries),
    },
    {
      label: "Current streak",
      value: String(streakInfo.streak),
      unit: "days",
      color: "var(--foreground)",
      hint:
        dueToday.length > 0 &&
        dueToday.every((t) => completedDailyIds.has(t.id))
          ? "today is safe"
          : "today still open",
      hintColor:
        dueToday.length > 0 &&
        dueToday.every((t) => completedDailyIds.has(t.id))
          ? "var(--done)"
          : "var(--warn)",
      foot: hits7 === 1 ? "1 hit" : `${hits7} hits`,
      bars: mkSparkBars(habitSeries),
    },
    {
      label: "Due this week",
      value: String(dueThisWeek.length),
      unit: "",
      color: "var(--foreground)",
      hint: dueThisWeek.length ? "next 7 days" : "clear week ahead",
      hintColor: "var(--faint)",
      foot: dueTodayCount
        ? `${dueTodayCount} today`
        : "none today",
      bars: mkSparkBars(dueSeries, 0),
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
      streak: streakInfo.streak,
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
