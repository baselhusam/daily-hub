import { format, startOfDay } from "date-fns";

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

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
