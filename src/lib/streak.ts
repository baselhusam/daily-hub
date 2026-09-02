import "server-only";

import { prisma } from "@/lib/prisma";
import { getTodayDate } from "@/lib/dates";
import { parseWeekdays } from "@/lib/weekdays-db";
import { calculateStreakInfo, type StreakInfo } from "@/lib/streak-utils";

export {
  calculateStreakInfo,
  daysUntil,
  formatEstimate,
  mkSparkBars,
  type SparkBar,
  type StreakInfo,
} from "@/lib/streak-utils";

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

  return calculateStreakInfo(tasks, logs, today);
}
