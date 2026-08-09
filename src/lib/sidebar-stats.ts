import { prisma } from "@/lib/prisma";
import { getTodayDate } from "@/lib/dates";
import { startOfWeek } from "date-fns";

export async function getSidebarStats() {
  const today = getTodayDate();
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });

  const [openTasks, completionsThisWeek, dailyTasks, todayDailyCompletions] =
    await Promise.all([
      prisma.task.count({ where: { status: { not: "DONE" } } }),
      prisma.completionLog.count({
        where: { completedOn: { gte: thisWeekStart } },
      }),
      prisma.dailyTask.count({ where: { isActive: true } }),
      prisma.completionLog.count({
        where: {
          entityType: "DAILY_TASK",
          completedOn: today,
        },
      }),
    ]);

  const dailyConsistencyToday =
    dailyTasks === 0
      ? 0
      : Math.round((todayDailyCompletions / dailyTasks) * 100);

  return {
    openTasks,
    completionsThisWeek,
    dailyConsistencyToday,
  };
}
