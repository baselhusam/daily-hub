import { subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  calendarDaysBetween,
  getTodayDate,
  groupCompletionDateKeys,
  isHabitDueOn,
  toDateOnlyString,
  type CalendarMode,
} from "@/lib/dates";

export type StreakInfo = {
  streak: number;
  dots: Array<{ color: string }>;
};

type DailyTaskLike = {
  id: string;
  weekdays: number[];
  createdAt?: Date;
};

export async function getStreakInfo(
  dailyTasks?: DailyTaskLike[]
): Promise<StreakInfo> {
  const today = getTodayDate();
  const tasks =
    dailyTasks ??
    (await prisma.dailyTask.findMany({
      where: { isActive: true },
      select: { id: true, weekdays: true, createdAt: true },
    }));

  const logs = await prisma.completionLog.findMany({
    where: { entityType: "DAILY_TASK" },
    select: { entityId: true, completedOn: true },
  });

  const keysByTask = groupCompletionDateKeys(logs);

  function dayOk(date: Date): boolean {
    const key = toDateOnlyString(date);
    const due = tasks.filter((t) =>
      isHabitDueOn(t.weekdays, date, {
        createdAt: t.createdAt,
        completedOnKeys: keysByTask.get(t.id),
      })
    );
    if (due.length === 0) return true;
    return due.every((t) => keysByTask.get(t.id)?.has(key));
  }

  let cursor = new Date(today);
  if (!dayOk(cursor)) {
    cursor = subDays(cursor, 1);
  }

  let streak = 0;
  let guard = 0;
  while (dayOk(cursor) && guard++ < 400) {
    streak++;
    cursor = subDays(cursor, 1);
  }

  const dots: Array<{ color: string }> = [];
  for (let k = 13; k >= 0; k--) {
    const dt = subDays(today, k);
    const ok = dayOk(dt);
    dots.push({
      color: ok
        ? k === 0
          ? "var(--chart-hit)"
          : "var(--chart-hit-soft)"
        : "var(--track)",
    });
  }

  return { streak, dots };
}

export function daysUntil(
  date: Date | null | undefined,
  today = getTodayDate(),
  mode: CalendarMode = "local"
): number | null {
  if (!date) return null;
  return calendarDaysBetween(date, today, mode);
}

export function formatEstimate(minutes: number | null | undefined): string | undefined {
  if (!minutes) return undefined;
  if (minutes >= 60) {
    const hours = Math.round((minutes / 60) * 10) / 10;
    return `${hours}h`;
  }
  return `${minutes}m`;
}

export function mkSparkBars(values: number[]): Array<{ height: number; opacity?: number }> {
  const max = Math.max(1, ...values);
  return values.map((v) => ({
    height: Math.max(3, Math.round((v / max) * 26)),
    opacity: v ? 1 : 0.28,
  }));
}
