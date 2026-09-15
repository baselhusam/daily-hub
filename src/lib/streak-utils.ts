import { subDays } from "date-fns";
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
  /** The longest run on record (within the last two years), for "best yet". */
  best: number;
  dots: Array<{ color: string }>;
};

/** How far back the best-streak scan looks; enough for any real chain. */
const BEST_STREAK_LOOKBACK_DAYS = 730;

export function emptyStreakInfo(): StreakInfo {
  return {
    streak: 0,
    best: 0,
    dots: Array.from({ length: 14 }, () => ({ color: "var(--track)" })),
  };
}

export type StreakTaskLike = {
  id: string;
  weekdays: number[];
  createdAt?: Date;
};

export function calculateStreakInfo(
  tasks: StreakTaskLike[],
  logs: Array<{ entityId: string; completedOn: Date }>,
  today = getTodayDate()
): StreakInfo {
  // A streak measures completed habits. With no active habits there is
  // nothing to complete, so every past day must not count as a success.
  if (tasks.length === 0) return emptyStreakInfo();

  const keysByTask = groupCompletionDateKeys(logs);
  const startedOn = tasks.reduce<Date | null>((earliest, task) => {
    if (!task.createdAt) return earliest;
    const createdAt = startOfCalendarDay(task.createdAt);
    return !earliest || createdAt < earliest ? createdAt : earliest;
  }, null);

  function dayOk(date: Date): boolean {
    if (startedOn && date < startedOn) return false;

    const key = toDateOnlyString(date);
    const due = tasks.filter((task) =>
      isHabitDueOn(task.weekdays, date, {
        createdAt: task.createdAt,
        completedOnKeys: keysByTask.get(task.id),
      })
    );
    if (due.length === 0) return true;
    return due.every((task) => keysByTask.get(task.id)?.has(key));
  }

  let cursor = new Date(today);
  if (!dayOk(cursor)) cursor = subDays(cursor, 1);

  let streak = 0;
  while (dayOk(cursor)) {
    streak++;
    cursor = subDays(cursor, 1);
  }

  // Longest run of good days between the first habit and yesterday; today
  // is still in progress so it neither breaks nor extends the record here.
  let best = 0;
  let run = 0;
  for (let k = 1; k <= BEST_STREAK_LOOKBACK_DAYS; k++) {
    const date = subDays(today, k);
    if (startedOn && date < startedOn) break;
    if (dayOk(date)) {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  best = Math.max(best, streak);

  const dots: Array<{ color: string }> = [];
  for (let k = 13; k >= 0; k--) {
    const ok = dayOk(subDays(today, k));
    dots.push({
      color: ok
        ? k === 0
          ? "var(--signal)"
          : "var(--chart-ink)"
        : "var(--track)",
    });
  }

  return { streak, best, dots };
}

function startOfCalendarDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysUntil(
  date: Date | null | undefined,
  today = getTodayDate(),
  mode: CalendarMode = "local"
): number | null {
  if (!date) return null;
  return calendarDaysBetween(date, today, mode);
}

export function formatEstimate(
  minutes: number | null | undefined
): string | undefined {
  if (!minutes) return undefined;
  if (minutes >= 60) {
    const hours = Math.round((minutes / 60) * 10) / 10;
    return `${hours}h`;
  }
  return `${minutes}m`;
}

export type SparkBar = {
  value: number;
  height: number;
  empty: boolean;
  today: boolean;
  date?: string;
  label?: string;
  fullLabel?: string;
};

export type SparkBarDay = { date: string; label: string; fullLabel: string };

export function mkSparkBars(
  values: number[],
  todayIndex = values.length - 1,
  days?: SparkBarDay[]
): SparkBar[] {
  const max = Math.max(1, ...values);
  return values.map((value, index) => {
    const meta = days?.[index];
    return {
      value,
      height: value ? Math.max(36, Math.round((value / max) * 100)) : 18,
      empty: value === 0,
      today: index === todayIndex,
      ...(meta
        ? { date: meta.date, label: meta.label, fullLabel: meta.fullLabel }
        : {}),
    };
  });
}
