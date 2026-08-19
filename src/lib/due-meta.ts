import {
  formatDueDate,
  getTodayDate,
  isOverdue,
  toDateOnlyString,
  type CalendarMode,
} from "@/lib/dates";
import { daysUntil } from "@/lib/streak";

export type DueMeta = {
  label: string;
  color: string;
  bg: string;
};

export function getDueMeta(
  dueDate: Date | null | undefined,
  today = getTodayDate(),
  mode: CalendarMode = "local"
): DueMeta | null {
  if (!dueDate) return null;

  const days = daysUntil(dueDate, today, mode);
  if (days === null) return null;

  if (isOverdue(dueDate, today, mode)) {
    const late = Math.abs(days);
    return {
      label: late === 1 ? "1d late" : `${late}d late`,
      color: "var(--destructive)",
      bg: "var(--destructive-wash)",
    };
  }

  if (days === 0) {
    return {
      label: "Today",
      color: "var(--signal)",
      bg: "var(--signal-soft)",
    };
  }

  if (days === 1) {
    return {
      label: "Tomorrow",
      color: "var(--muted-foreground)",
      bg: "var(--paper)",
    };
  }

  if (days <= 7) {
    return {
      label: `${days}d`,
      color: "var(--signal)",
      bg: "var(--signal-soft)",
    };
  }

  return {
    label: formatDueDate(dueDate, today, mode),
    color: "var(--muted-foreground)",
    bg: "var(--paper)",
  };
}

export function getDeadlineColor(days: number | null): string {
  if (days === null) return "var(--faint)";
  if (days < 0) return "var(--destructive)";
  if (days <= 7) return "var(--signal)";
  if (days <= 21) return "var(--warn)";
  return "var(--muted-foreground)";
}

export function isCompletedToday(
  completedAt: Date | null | undefined,
  today = getTodayDate()
): boolean {
  if (!completedAt) return false;
  return toDateOnlyString(completedAt) === toDateOnlyString(today);
}
