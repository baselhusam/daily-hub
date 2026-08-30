import {
  calendarDaysBetween,
  getTodayDate,
  type CalendarMode,
} from "@/lib/dates";

export type StreakInfo = {
  streak: number;
  dots: Array<{ color: string }>;
};

export function emptyStreakInfo(): StreakInfo {
  return {
    streak: 0,
    dots: Array.from({ length: 14 }, () => ({ color: "var(--track)" })),
  };
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
};

export function mkSparkBars(
  values: number[],
  todayIndex = values.length - 1
): SparkBar[] {
  const max = Math.max(1, ...values);
  return values.map((value, index) => ({
    value,
    height: value ? Math.max(36, Math.round((value / max) * 100)) : 18,
    empty: value === 0,
    today: index === todayIndex,
  }));
}
