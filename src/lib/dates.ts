import {
  format,
  isThisYear,
  isToday,
  isTomorrow,
  isYesterday,
  startOfDay,
} from "date-fns";

export function getTodayDate(): Date {
  return startOfDay(new Date());
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

export function formatDueDate(date: Date | null | undefined): string {
  if (!date) return "No date";
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";
  if (isThisYear(date)) return format(date, "EEE, MMM d");
  return format(date, "MMM d, yyyy");
}

export function isOverdue(dueDate: Date | null | undefined, today = getTodayDate()): boolean {
  if (!dueDate) return false;
  return startOfDay(dueDate) < today;
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
