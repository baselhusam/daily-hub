import {
  formatDueDate,
  getTodayDate,
  isOverdue,
  toDateOnlyString,
} from "@/lib/dates";
import { daysUntil } from "@/lib/streak";

export type DueMeta = {
  label: string;
  color: string;
  bg: string;
};

export function getDueMeta(
  dueDate: Date | null | undefined,
  today = getTodayDate()
): DueMeta | null {
  if (!dueDate) return null;

  const days = daysUntil(dueDate, today);
  if (days === null) return null;

  if (isOverdue(dueDate, today)) {
    const late = Math.abs(days);
    return {
      label: late === 1 ? "1d late" : `${late}d late`,
      color: "#C4554D",
      bg: "#FBECEB",
    };
  }

  if (days === 0) {
    return {
      label: "Today",
      color: "#2383E2",
      bg: "#EAF3FB",
    };
  }

  if (days === 1) {
    return {
      label: "Tomorrow",
      color: "#787774",
      bg: "#F7F7F5",
    };
  }

  if (days <= 7) {
    return {
      label: `${days}d`,
      color: "#2383E2",
      bg: "#EAF3FB",
    };
  }

  return {
    label: formatDueDate(dueDate),
    color: "#787774",
    bg: "#F7F7F5",
  };
}

export function getDeadlineColor(days: number | null): string {
  if (days === null) return "#9B9A97";
  if (days < 0) return "#C4554D";
  if (days <= 7) return "#2383E2";
  if (days <= 21) return "#D9730D";
  return "#787774";
}

export function isCompletedToday(
  completedAt: Date | null | undefined,
  today = getTodayDate()
): boolean {
  if (!completedAt) return false;
  return toDateOnlyString(completedAt) === toDateOnlyString(today);
}
