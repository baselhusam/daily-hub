import { subDays, eachDayOfInterval } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getTodayDate, isScheduledOn, toDateOnlyString } from "@/lib/dates";

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
  isToday: boolean;
};

export type BusinessHoursAnalytics = {
  name: string;
  hours: number;
  share: string;
  color: string;
  barWidth: number;
};

export type ProjectProgressAnalytics = {
  id: string;
  name: string;
  note: string;
  noteColor: string;
  barWidth: number;
  color: string;
};

export type HabitConsistencyAnalytics = {
  id: string;
  title: string;
  dots: Array<{ color: string }>;
  rate: number;
  rateColor: string;
};

export type WeekdayAnalytics = {
  id: number;
  label: string;
  count: number;
  labelColor: string;
  barHeight: number;
};

export type TimeOfDayAnalytics = {
  name: string;
  count: number;
  barWidth: number;
  isPeak: boolean;
};

export type AnalyticsData = {
  rangeDays: number;
  rangeLabel: string;
  lede: string;
  bigStats: Array<{
    label: string;
    value: string;
    unit: string;
    color: string;
  }>;
  overview: AnalyticsOverview;
  completionsByDay: CompletionDayPoint[];
  byBusiness: BusinessHoursAnalytics[];
  byProject: ProjectProgressAnalytics[];
  dailyTaskStats: HabitConsistencyAnalytics[];
  weekdays: WeekdayAnalytics[];
  weekdayNote: string;
  timeOfDay: TimeOfDayAnalytics[];
  timeOfDayNote: string;
};

const ANALYTICS_WINDOW_DAYS = 14;

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
  const todayKey = toDateOnlyString(today);
  const windowStart = subDays(today, ANALYTICS_WINDOW_DAYS - 1);
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
    tasks,
  ] = await Promise.all([
    prisma.completionLog.count(),
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
    prisma.completionLog.count({
      where: { completedOn: { gte: thisWeekStart } },
    }),
    prisma.completionLog.count({
      where: {
        completedOn: { gte: lastWeekStart, lte: lastWeekEnd },
      },
    }),
    prisma.completionLog.findMany({
      where: {
        entityType: "DAILY_TASK",
        completedOn: today,
      },
      select: { entityId: true },
    }),
    prisma.task.count({ where: { status: { not: "DONE" } } }),
    prisma.task.count({ where: { status: "DONE" } }),
    prisma.business.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, color: true },
    }),
    prisma.project.findMany({
      include: {
        business: { select: { id: true, name: true } },
        tasks: { select: { id: true, status: true } },
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.dailyTask.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.task.findMany({
      select: {
        id: true,
        businessId: true,
        projectId: true,
        project: { select: { businessId: true } },
      },
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

  const scheduledToday = dailyTasks.filter((task) =>
    isScheduledOn(task.weekdays, today)
  );
  const completedTodayIds = new Set(todayDailyCompletions.map((c) => c.entityId));

  const dailyConsistencyToday =
    scheduledToday.length === 0
      ? 0
      : Math.round(
          (scheduledToday.filter((task) => completedTodayIds.has(task.id)).length /
            scheduledToday.length) *
            100
        );

  const dayRange = eachDayOfInterval({ start: windowStart, end: today });

  const completionsByDay: CompletionDayPoint[] = dayRange.map((day) => {
    const dateKey = toDateOnlyString(day);
    const dayLogs = windowCompletions.filter(
      (log) => toDateOnlyString(log.completedOn) === dateKey
    );
    const tasksCount = dayLogs.filter((l) => l.entityType === "TASK").length;
    const daily = dayLogs.filter((l) => l.entityType === "DAILY_TASK").length;

    return {
      date: dateKey,
      label: `${day.getDate()}/${day.getMonth() + 1}`,
      tasks: tasksCount,
      daily,
      total: tasksCount + daily,
      isToday: dateKey === todayKey,
    };
  });

  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const businessMap = new Map(businesses.map((b) => [b.id, b]));

  const bizBuckets = new Map<
    string,
    { name: string; color: string; minutes: number; count: number }
  >();

  for (const log of windowCompletions) {
    let bucketKey = "inbox";
    let name = "Inbox & habits";
    let color = "#9B9A97";

    if (log.entityType === "TASK") {
      const task = taskMap.get(log.entityId);
      if (task?.projectId) {
        const project = projectMap.get(task.projectId);
        if (project?.businessId) {
          const biz = businessMap.get(project.businessId);
          if (biz) {
            bucketKey = biz.id;
            name = biz.name;
            color = biz.color;
          }
        } else if (project) {
          bucketKey = `solo:${project.id}`;
          name = `${project.name} (standalone)`;
          color = project.color ?? "#37352F";
        }
      }
    }

    const existing = bizBuckets.get(bucketKey) ?? {
      name,
      color,
      minutes: 0,
      count: 0,
    };
    existing.minutes += log.minutes ?? 0;
    existing.count += 1;
    bizBuckets.set(bucketKey, existing);
  }

  const totalMinutes = windowCompletions.reduce(
    (sum, l) => sum + (l.minutes ?? 0),
    0
  );
  const bizArr = [...bizBuckets.values()].sort((a, b) => b.minutes - a.minutes);
  const bizMax = Math.max(1, ...bizArr.map((b) => b.minutes));

  const byBusiness: BusinessHoursAnalytics[] = bizArr.map((b) => ({
    name: b.name,
    hours: Math.round(b.minutes / 60),
    share: totalMinutes
      ? `${Math.round((b.minutes / totalMinutes) * 100)}%`
      : "0%",
    color: b.color,
    barWidth: Math.round((b.minutes / bizMax) * 100),
  }));

  const projectLastTouch = new Map<string, string>();
  for (const log of windowCompletions) {
    if (log.entityType !== "TASK") continue;
    const task = taskMap.get(log.entityId);
    if (!task?.projectId) continue;
    const key = toDateOnlyString(log.completedOn);
    const prev = projectLastTouch.get(task.projectId);
    if (!prev || key > prev) projectLastTouch.set(task.projectId, key);
  }

  const byProject: ProjectProgressAnalytics[] = projects.map((project) => {
    const open = project.tasks.filter((t) => t.status !== "DONE").length;
    const done = project.tasks.filter((t) => t.status === "DONE").length;
    const total = open + done;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    const last = projectLastTouch.get(project.id);
    const idle = last
      ? Math.floor(
          (today.getTime() - new Date(last).getTime()) / 86400000
        )
      : 99;

    return {
      id: project.id,
      name: project.name,
      note:
        idle >= 7
          ? `idle ${idle === 99 ? "always" : `${idle}d`}`
          : `${pct}% · ${open} open`,
      noteColor: idle >= 7 ? "#2383E2" : "#787774",
      barWidth: Math.max(2, pct),
      color: project.color ?? "#37352F",
    };
  });

  const dailyTaskStats: HabitConsistencyAnalytics[] = dailyTasks.map((task) => {
    const dots = dayRange.map((day) => {
      if (!isScheduledOn(task.weekdays, day)) {
        return { color: "#F7F7F5" };
      }
      const key = toDateOnlyString(day);
      const ok = windowCompletions.some(
        (c) =>
          c.entityType === "DAILY_TASK" &&
          c.entityId === task.id &&
          toDateOnlyString(c.completedOn) === key
      );
      return {
        color: ok ? (key === todayKey ? "#2383E2" : "#9CC7EE") : "#EDEDEC",
      };
    });

    const scheduled = dayRange.filter((day) =>
      isScheduledOn(task.weekdays, day)
    ).length;
    const hit = dots.filter((d) => d.color !== "#EDEDEC" && d.color !== "#F7F7F5")
      .length;
    const rate = scheduled === 0 ? 0 : Math.round((hit / scheduled) * 100);

    return {
      id: task.id,
      title: task.title,
      dots,
      rate,
      rateColor: rate >= 80 ? "#448361" : rate >= 50 ? "#787774" : "#C4554D",
    };
  });

  const wdCounts = [0, 0, 0, 0, 0, 0, 0];
  const wdDays = [0, 0, 0, 0, 0, 0, 0];
  for (const day of dayRange) {
    const dow = day.getDay();
    const key = toDateOnlyString(day);
    const count = windowCompletions.filter(
      (l) => toDateOnlyString(l.completedOn) === key
    ).length;
    wdCounts[dow] += count;
    wdDays[dow] += 1;
  }

  const wdAvg = wdCounts.map((c, i) => (wdDays[i] ? c / wdDays[i] : 0));
  const order = [1, 2, 3, 4, 5, 6, 0];
  const wdMax = Math.max(0.1, ...wdAvg);
  let bestI = order[0];
  let worstI = order[0];
  for (const i of order) {
    if (wdAvg[i] > wdAvg[bestI]) bestI = i;
    if (wdAvg[i] < wdAvg[worstI]) worstI = i;
  }

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dow = today.getDay();

  const weekdays: WeekdayAnalytics[] = order.map((i) => ({
    id: i,
    label: dayLabels[i],
    count: Math.round(wdAvg[i] * 10) / 10,
    labelColor:
      i === bestI ? "#2383E2" : i === dow ? "#37352F" : "#9B9A97",
    barHeight: Math.max(3, Math.round((wdAvg[i] / wdMax) * 100)),
  }));

  const buckets = [
    { name: "Morning", lo: 5, hi: 11 },
    { name: "Midday", lo: 12, hi: 16 },
    { name: "Evening", lo: 17, hi: 21 },
    { name: "Late night", lo: 22, hi: 28 },
  ];

  const bCounts = buckets.map((b) =>
    windowCompletions.filter((l) => {
      const hr = l.completedAt.getHours();
      const adjusted = hr < 5 ? hr + 24 : hr;
      return adjusted >= b.lo && adjusted <= b.hi;
    }).length
  );
  const bMax = Math.max(1, ...bCounts);
  let peak = 0;
  bCounts.forEach((c, i) => {
    if (c > bCounts[peak]) peak = i;
  });

  const timeOfDay: TimeOfDayAnalytics[] = buckets.map((b, i) => ({
    name: b.name,
    count: bCounts[i],
    barWidth: Math.max(2, Math.round((bCounts[i] / bMax) * 100)),
    isPeak: i === peak,
  }));

  const activeProjects = projects.filter((p) => p.status === "ACTIVE").length;
  const rangeLogs = windowCompletions;

  return {
    rangeDays: ANALYTICS_WINDOW_DAYS,
    rangeLabel: `Last ${ANALYTICS_WINDOW_DAYS} days`,
    lede: rangeLogs.length
      ? `You logged ${rangeLogs.length} completions and about ${Math.round(totalMinutes / 60)} hours of focus. ${dayNames[bestI]} is your strongest day.`
      : "Nothing logged in this window yet.",
    bigStats: [
      {
        label: "Completed",
        value: String(rangeLogs.length),
        unit: "items",
        color: "#37352F",
      },
      {
        label: "Tasks",
        value: String(
          rangeLogs.filter((l) => l.entityType === "TASK").length
        ),
        unit: "done",
        color: "#37352F",
      },
      {
        label: "Habit check-ins",
        value: String(
          rangeLogs.filter((l) => l.entityType === "DAILY_TASK").length
        ),
        unit: "",
        color: "#787774",
      },
      {
        label: "Focus time",
        value: String(Math.round(totalMinutes / 60)),
        unit: "hours",
        color: "#2383E2",
      },
      {
        label: "Per day",
        value: (rangeLogs.length / ANALYTICS_WINDOW_DAYS).toFixed(1),
        unit: "avg",
        color: "#37352F",
      },
    ],
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
    weekdays,
    weekdayNote: `${dayNames[bestI]} is your strongest day · ${dayNames[worstI]} your weakest`,
    timeOfDay,
    timeOfDayNote: `Peak stretch: ${buckets[peak].name.toLowerCase()}`,
  };
}
