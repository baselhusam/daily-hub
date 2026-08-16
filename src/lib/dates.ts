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

export function toDateOnlyString(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function parseDateInput(value: string | null | undefined): Date | null {
  if (!value || value === "") return null;
  const parsed = startOfDay(new Date(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
