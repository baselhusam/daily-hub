import { startOfDay } from "date-fns";

export function getTodayDate(): Date {
  return startOfDay(new Date());
}

export function toDateOnlyString(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
