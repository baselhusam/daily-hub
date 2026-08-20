import {
  calendarDaysBetween,
  getTodayDate,
  type CalendarMode,
} from "@/lib/dates";

export type StreakInfo = {
  streak: number;
  dots: Array<{ color: string }>;
};

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

export function mkSparkBars(
  values: number[]
): Array<{ height: number; opacity?: number }> {
  const max = Math.max(1, ...values);
  return values.map((v) => ({
    height: Math.max(3, Math.round((v / max) * 26)),
    opacity: v ? 1 : 0.28,
  }));
}
