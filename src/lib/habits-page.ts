import { prisma } from "@/lib/prisma";
import {
  formatWeekdays,
  getTodayDate,
  groupCompletionDateKeys,
  isHabitDueOn,
  toDateOnlyString,
} from "@/lib/dates";
import {
  chainHistory,
  completionKeys,
  consistency,
  currentChain,
  strip,
  weeklyConsistency,
  type StripCell,
} from "@/lib/habit-stats";
import { getSettings, type WeekStart } from "@/lib/settings";
import { withParsedWeekdays } from "@/lib/weekdays-db";

export type HabitRow = {
  id: string;
  title: string;
  iconKey: string;
  logoUrl: string | null;
  weekdays: number[];
  isActive: boolean;
  scheduleLabel: string;
  chain: number;
  /** Trailing-fortnight completion rate; null until there is history. */
  rate: number | null;
  missed: number;
  scheduled: number;
  strip: StripCell[];
  dueToday: boolean;
  completedToday: boolean;
};

export type HabitsPageData = {
  todayISO: string;
  weekStartsOn: WeekStart;
  habits: HabitRow[];
  tiles: {
    keptToday: number;
    dueToday: number;
    /** Mean of the active habits' rates, null with no history. */
    averageRate: number | null;
    weekly: Array<{ rate: number | null; scheduled: number }>;
    /** Latest week minus the week before, in points; null when either is empty. */
    weeklyDelta: number | null;
    longest: { habitId: string; title: string; chain: number; history: number[] } | null;
    atRisk: Array<{ habitId: string; title: string; rate: number; missed: number; scheduled: number }>;
  };
};

export async function getHabitsPageData(): Promise<HabitsPageData> {
  const today = getTodayDate();
  const todayKey = toDateOnlyString(today);
  const settings = await getSettings();

  const [rows, completions] = await Promise.all([
    prisma.dailyTask
      .findMany({ orderBy: { sortOrder: "asc" } })
      .then((list) => list.map(withParsedWeekdays)),
    prisma.completionLog.findMany({
      where: { entityType: "DAILY_TASK" },
      select: { entityId: true, completedOn: true },
    }),
  ]);

  const keyMap = completionKeys(completions);
  const dueKeys = groupCompletionDateKeys(completions);

  const habits: HabitRow[] = rows.map((row) => {
    const keys = keyMap.get(row.id);
    const stats = consistency(row, keys, today);
    return {
      id: row.id,
      title: row.title,
      iconKey: row.iconKey,
      logoUrl: row.logoUrl,
      weekdays: row.weekdays,
      isActive: row.isActive,
      scheduleLabel: formatWeekdays(row.weekdays),
      chain: currentChain(row, keys, today),
      rate: stats.rate,
      missed: stats.missed,
      scheduled: stats.scheduled,
      strip: strip(row, keys, today),
      dueToday:
        row.isActive &&
        isHabitDueOn(row.weekdays, today, {
          createdAt: row.createdAt,
          completedOnKeys: dueKeys.get(row.id),
        }),
      completedToday: keys?.has(todayKey) ?? false,
    };
  });

  const active = habits.filter((habit) => habit.isActive);
  const rated = active.filter((habit) => habit.rate !== null);
  const averageRate =
    rated.length === 0
      ? null
      : Math.round(rated.reduce((sum, habit) => sum + (habit.rate ?? 0), 0) / rated.length);
  const weekly = weeklyConsistency(rows, keyMap, today, settings.weekStartsOn);
  const latest = weekly[weekly.length - 1]?.rate ?? null;
  const previous = weekly[weekly.length - 2]?.rate ?? null;
  const longestHabit = active.reduce<HabitRow | null>(
    (best, habit) => (habit.chain > (best?.chain ?? 0) ? habit : best),
    null
  );
  const longestRow = longestHabit ? rows.find((row) => row.id === longestHabit.id) : undefined;

  return {
    todayISO: today.toISOString(),
    weekStartsOn: settings.weekStartsOn,
    habits,
    tiles: {
      keptToday: habits.filter((habit) => habit.dueToday && habit.completedToday).length,
      dueToday: habits.filter((habit) => habit.dueToday).length,
      averageRate,
      weekly,
      weeklyDelta: latest === null || previous === null ? null : latest - previous,
      longest:
        longestHabit && longestRow
          ? {
              habitId: longestHabit.id,
              title: longestHabit.title,
              chain: longestHabit.chain,
              history: chainHistory(longestRow, keyMap.get(longestRow.id), today),
            }
          : null,
      atRisk: active
        .filter((habit) => habit.rate !== null && habit.rate < 50)
        .sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0))
        .map((habit) => ({
          habitId: habit.id,
          title: habit.title,
          rate: habit.rate ?? 0,
          missed: habit.missed,
          scheduled: habit.scheduled,
        })),
    },
  };
}
