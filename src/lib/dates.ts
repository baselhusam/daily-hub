import {
  format,
  isThisYear,
  startOfDay,
} from "date-fns";

export function getTodayDate(): Date {
  return startOfDay(new Date());
}

export function getGreeting(name: string, now = new Date()): string {
  const hour = now.getHours();
  const prefix =
    hour < 5
      ? "Still up, "
      : hour < 12
        ? "Good morning, "
        : hour < 17
          ? "Good afternoon, "
          : "Good evening, ";
  return `${prefix}${name}.`;
}

export function formatTodayLabel(date = getTodayDate()): string {
  return format(date, "EEEE · MMMM d, yyyy");
}

export type CalendarMode = "utc" | "local";

function calendarStamp(date: Date, mode: CalendarMode): number {
  if (mode === "utc") {
    return Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    );
  }
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

export function calendarDaysBetween(
  target: Date,
  today: Date,
  mode: CalendarMode = "local"
): number {
  return Math.round(
    (calendarStamp(target, mode) - calendarStamp(today, mode)) / 86400000
  );
}

/** Prisma DateTime cannot serialize years outside 0001–9999. */
export const MIN_CALENDAR_YEAR = 1900;
export const MAX_CALENDAR_YEAR = 9999;
export const DATE_INPUT_MIN = "1900-01-01";
export const DATE_INPUT_MAX = "9999-12-31";

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toDateOnlyString(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function parseDateInput(value: string | null | undefined): Date | null {
  if (!value || value === "") return null;

  const match = DATE_ONLY_RE.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < MIN_CALENDAR_YEAR || year > MAX_CALENDAR_YEAR) return null;

  const parsed = startOfDay(new Date(year, month - 1, day));
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

export function formatDueDate(
  date: Date | null | undefined,
  today = getTodayDate(),
  mode: CalendarMode = "local"
): string {
  if (!date) return "No date";
  const days = calendarDaysBetween(date, today, mode);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (isThisYear(date)) return format(date, "EEE, MMM d");
  return format(date, "MMM d, yyyy");
}

export function isOverdue(
  dueDate: Date | null | undefined,
  today = getTodayDate(),
  mode: CalendarMode = "local"
): boolean {
  if (!dueDate) return false;
  return calendarDaysBetween(dueDate, today, mode) < 0;
}

export function isScheduledOn(weekdays: number[], date = new Date()): boolean {
  return weekdays.includes(date.getDay());
}

export const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;
export const WEEKDAY_SHORT = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

export function formatWeekdays(weekdays: number[]): string {
  const unique = [...new Set(weekdays)].sort((a, b) => a - b);
  if (unique.length === 7) return "Every day";
  if (unique.join() === "1,2,3,4,5") return "Weekdays";
  if (unique.join() === "0,6") return "Weekends";

  const mondayFirst = [
    ...unique.filter((day) => day !== 0),
    ...unique.filter((day) => day === 0),
  ];
  return mondayFirst.map((day) => WEEKDAY_SHORT[day]).join(", ");
}
