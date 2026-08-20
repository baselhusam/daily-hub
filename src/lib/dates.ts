import {
  addDays,
  format,
  isThisYear,
  startOfDay,
  subDays,
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

export function isSameCalendarDay(
  a: Date,
  b: Date,
  mode: CalendarMode = "local"
): boolean {
  return calendarDaysBetween(a, b, mode) === 0;
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

export function formatAddedAgo(
  createdAt: Date | null | undefined,
  today = getTodayDate(),
  mode: CalendarMode = "local"
): string | undefined {
  if (!createdAt) return undefined;
  const age = Math.max(0, calendarDaysBetween(today, createdAt, mode));
  if (age === 0) return "Added today";
  if (age === 1) return "Added 1 day ago";
  if (age < 14) return `Added ${age} days ago`;
  const weeks = Math.round(age / 7);
  if (age < 60) {
    return weeks === 1 ? "Added 1 week ago" : `Added ${weeks} weeks ago`;
  }
  return `Added ${format(createdAt, isThisYear(createdAt) ? "MMM d" : "MMM d, yyyy")}`;
}

export function formatCompletedAgo(
  completedAt: Date | null | undefined,
  today = getTodayDate(),
  mode: CalendarMode = "local"
): string | undefined {
  if (!completedAt) return undefined;
  const age = Math.max(0, calendarDaysBetween(today, completedAt, mode));
  if (age === 0) return "Done today";
  if (age === 1) return "Done yesterday";
  if (age < 14) return `Done ${age} days ago`;
  const weeks = Math.round(age / 7);
  if (age < 60) {
    return weeks === 1 ? "Done 1 week ago" : `Done ${weeks} weeks ago`;
  }
  return `Done ${format(completedAt, isThisYear(completedAt) ? "MMM d" : "MMM d, yyyy")}`;
}

export function formatLogDay(
  date: Date,
  today = getTodayDate(),
  mode: CalendarMode = "local"
): string {
  const days = calendarDaysBetween(date, today, mode);
  if (days === 0) return "Today";
  if (days === -1) return "Yesterday";
  if (isThisYear(date)) return format(date, "EEEE, MMM d");
  return format(date, "EEE, MMM d, yyyy");
}

export function calendarDayKey(
  date: Date,
  mode: CalendarMode = "local"
): string {
  if (mode === "utc") {
    return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
  }
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
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

/** Most recent scheduled day strictly before `date`, within the past week. */
export function previousScheduledDate(
  weekdays: number[],
  date: Date,
  notBefore?: Date
): Date | null {
  if (weekdays.length === 0) return null;
  const floor = notBefore ? startOfDay(notBefore) : undefined;
  for (let i = 1; i <= 7; i++) {
    const candidate = startOfDay(subDays(date, i));
    if (floor && candidate < floor) return null;
    if (isScheduledOn(weekdays, candidate)) return candidate;
  }
  return null;
}

export function groupCompletionDateKeys(
  logs: Array<{ entityId: string; completedOn: Date }>
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const log of logs) {
    const key = toDateOnlyString(log.completedOn);
    const existing = map.get(log.entityId);
    if (existing) existing.add(key);
    else map.set(log.entityId, new Set([key]));
  }
  return map;
}

/**
 * A habit is due on its scheduled weekdays. If the last scheduled day was
 * missed, it stays due on the days in between until the next scheduled day
 * starts a fresh occurrence.
 */
export function isHabitDueOn(
  weekdays: number[],
  date: Date,
  options?: {
    createdAt?: Date | null;
    completedOnKeys?: Iterable<string>;
  }
): boolean {
  const day = startOfDay(date);
  const createdAt = options?.createdAt
    ? startOfDay(options.createdAt)
    : undefined;
  if (createdAt && day < createdAt) return false;
  if (weekdays.length === 0) return false;
  if (isScheduledOn(weekdays, day)) return true;

  const prev = previousScheduledDate(weekdays, day, createdAt);
  if (!prev) return false;

  const completed = new Set(options?.completedOnKeys ?? []);
  for (
    let cursor = new Date(prev);
    cursor < day;
    cursor = addDays(cursor, 1)
  ) {
    if (completed.has(toDateOnlyString(cursor))) return false;
  }
  return true;
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
