import "server-only";

import { subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  getTodayDate,
  groupCompletionDateKeys,
  isHabitDueOn,
  toDateOnlyString,
} from "@/lib/dates";
import { parseWeekdays } from "@/lib/weekdays-db";
import { emptyStreakInfo, type StreakInfo } from "@/lib/streak-utils";

export type { SparkBar, StreakInfo } from "@/lib/streak-utils";
export { daysUntil, formatEstimate, mkSparkBars } from "@/lib/streak-utils";

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
    })).map((task) => ({
      ...task,
      weekdays: parseWeekdays(task.weekdays),
    }));

  const logs = await prisma.completionLog.findMany({
    where: { entityType: "DAILY_TASK" },
    select: { entityId: true, completedOn: true },
  });

  // A streak measures completed habits. With no active habits there is
  // nothing to complete, so every past day must not count as a success.
  if (tasks.length === 0) return emptyStreakInfo();

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
