import { subDays, eachDayOfInterval, format } from "date-fns";
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
  activeProjects: number;
  totalDailyTasks: number;
};

export type CompletionDayPoint = {
  date: string;
  label: string;
  fullLabel: string;
  weekday: number;
  weekdayName: string;
  tasks: number;
  daily: number;
  total: number;
  isToday: boolean;
};

export type FocusHoursAnalytics = {
  id: string;
  name: string;
  hours: number;
  minutes: number;
  share: string;
  color: string;
  barWidth: number;
  logoUrl?: string | null;
  iconKey?: string | null;
};

export type ProjectProgressAnalytics = {
  id: string;
  name: string;
  note: string;
  noteColor: string;
  barWidth: number;
  color: string;
  logoUrl: string | null;
  iconKey: string;
};

export type HabitDot = {
  color: string;
  date: string;
  status: "hit" | "miss" | "off";
};

export type HabitConsistencyAnalytics = {
  id: string;
  title: string;
  dots: HabitDot[];
  rate: number;
  rateColor: string;
  logoUrl: string | null;
  iconKey: string;
};

export type WeekdayAnalytics = {
  id: number;
  label: string;
  name: string;
  count: number;
  labelColor: string;
  barHeight: number;
  isBest: boolean;
  isWeakest: boolean;
};

export type TimeOfDayAnalytics = {
  name: string;
  range: string;
  count: number;
  barWidth: number;
  isPeak: boolean;
};

export type AnalyticsStatKey =
  | "completed"
  | "tasks"
  | "habits"
  | "focus"
  | "perDay";

export type AnalyticsData = {
  rangeDays: number;
  rangeLabel: string;
  lede: string;
  bigStats: Array<{
    key: AnalyticsStatKey;
    label: string;
    value: string;
    unit: string;
    color: string;
    hint: string;
  }>;
  overview: AnalyticsOverview;
  completionsByDay: CompletionDayPoint[];
  focusByProject: FocusHoursAnalytics[];
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
    prisma.project.findMany({
      include: {
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
        projectId: true,
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
      fullLabel: format(day, "EEE d MMM"),
      weekday: day.getDay(),
      weekdayName: format(day, "EEEE"),
      tasks: tasksCount,
      daily,
      total: tasksCount + daily,
      isToday: dateKey === todayKey,
    };
  });

  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  const hoursBuckets = new Map<
    string,
    {
      id: string;
      name: string;
      color: string;
      minutes: number;
      count: number;
      logoUrl: string | null;
      iconKey: string | null;
    }
  >();

  for (const log of windowCompletions) {
    let bucketKey = "inbox";
    let name = "Inbox & habits";
    let color = "#9B9A97";
    let logoUrl: string | null = null;
    let iconKey: string | null = null;

    if (log.entityType === "TASK") {
      const task = taskMap.get(log.entityId);
      if (task?.projectId) {
        const project = projectMap.get(task.projectId);
        if (project) {
          bucketKey = project.id;
          name = project.name;
          color = project.color ?? "#37352F";
          logoUrl = project.logoUrl;
          iconKey = project.iconKey;
        }
      }
    }

    const existing = hoursBuckets.get(bucketKey) ?? {
      id: bucketKey,
      name,
      color,
      minutes: 0,
      count: 0,
      logoUrl,
      iconKey,
    };
    existing.minutes += log.minutes ?? 0;
    existing.count += 1;
    hoursBuckets.set(bucketKey, existing);
  }

  const totalMinutes = windowCompletions.reduce(
    (sum, l) => sum + (l.minutes ?? 0),
    0
  );
  const hoursArr = [...hoursBuckets.values()].sort((a, b) => b.minutes - a.minutes);
  const hoursMax = Math.max(1, ...hoursArr.map((b) => b.minutes));

  const focusByProject: FocusHoursAnalytics[] = hoursArr.map((b) => ({
    id: b.id,
    name: b.name,
    hours: Math.round(b.minutes / 60),
    minutes: b.minutes,
    share: totalMinutes
      ? `${Math.round((b.minutes / totalMinutes) * 100)}%`
      : "0%",
    color: b.color,
    barWidth: Math.round((b.minutes / hoursMax) * 100),
    logoUrl: b.logoUrl,
    iconKey: b.iconKey,
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
      logoUrl: project.logoUrl,
      iconKey: project.iconKey,
    };
  });

  const dailyTaskStats: HabitConsistencyAnalytics[] = dailyTasks.map((task) => {
    const dots = dayRange.map((day) => {
      const key = toDateOnlyString(day);
      if (!isScheduledOn(task.weekdays, day)) {
        return { date: key, status: "off" as const, color: "#F7F7F5" };
      }
      const ok = windowCompletions.some(
        (c) =>
          c.entityType === "DAILY_TASK" &&
          c.entityId === task.id &&
          toDateOnlyString(c.completedOn) === key
      );
      return {
        date: key,
        status: (ok ? "hit" : "miss") as "hit" | "miss",
        color: ok ? (key === todayKey ? "#2383E2" : "#9CC7EE") : "#EDEDEC",
      };
    });

    const scheduled = dayRange.filter((day) =>
      isScheduledOn(task.weekdays, day)
    ).length;
    const hit = dots.filter((d) => d.status === "hit").length;
    const rate = scheduled === 0 ? 0 : Math.round((hit / scheduled) * 100);

    return {
      id: task.id,
      title: task.title,
      dots,
      rate,
      rateColor: rate >= 80 ? "#448361" : rate >= 50 ? "#787774" : "#C4554D",
      logoUrl: task.logoUrl,
      iconKey: task.iconKey,
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
    name: dayNames[i],
    count: Math.round(wdAvg[i] * 10) / 10,
    labelColor:
      i === bestI ? "#2383E2" : i === dow ? "#37352F" : "#9B9A97",
    barHeight: Math.max(3, Math.round((wdAvg[i] / wdMax) * 100)),
    isBest: i === bestI,
    isWeakest: i === worstI,
  }));

  const buckets = [
    { name: "Morning", lo: 5, hi: 11, range: "5–11am" },
    { name: "Midday", lo: 12, hi: 16, range: "12–4pm" },
    { name: "Evening", lo: 17, hi: 21, range: "5–9pm" },
    { name: "Late night", lo: 22, hi: 28, range: "10pm–4am" },
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
    range: b.range,
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
        key: "completed",
        label: "Completed",
        value: String(rangeLogs.length),
        unit: "items",
        color: "#37352F",
        hint: "Everything you checked off in this window",
      },
      {
        key: "tasks",
        label: "Tasks",
        value: String(
          rangeLogs.filter((l) => l.entityType === "TASK").length
        ),
        unit: "done",
        color: "#37352F",
        hint: "One-off work finished — click to isolate the chart",
      },
      {
        key: "habits",
        label: "Habit check-ins",
        value: String(
          rangeLogs.filter((l) => l.entityType === "DAILY_TASK").length
        ),
        unit: "",
        color: "#787774",
        hint: "Scheduled days you showed up",
      },
      {
        key: "focus",
        label: "Focus time",
        value: String(Math.round(totalMinutes / 60)),
        unit: "hours",
        color: "#2383E2",
        hint: "Minutes logged across projects",
      },
      {
        key: "perDay",
        label: "Per day",
        value: (rangeLogs.length / ANALYTICS_WINDOW_DAYS).toFixed(1),
        unit: "avg",
        color: "#37352F",
        hint: "Average completions per day",
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
      activeProjects,
      totalDailyTasks: dailyTasks.length,
    },
    completionsByDay,
    focusByProject,
    byProject,
    dailyTaskStats,
    weekdays,
    weekdayNote: `${dayNames[bestI]} is your strongest day · ${dayNames[worstI]} your weakest`,
    timeOfDay,
    timeOfDayNote: `Peak stretch: ${buckets[peak].name.toLowerCase()}`,
  };
}
