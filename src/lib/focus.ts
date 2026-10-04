import { addDays } from "date-fns";
import { calendarDaysBetween, type CalendarMode } from "@/lib/dates";

/**
 * How long a focus lasts. Each span counts today as its first day, so
 * "3d" keeps something in focus today, tomorrow, and the day after.
 */
export const FOCUS_SPANS = ["today", "3d", "week", "open"] as const;
export type FocusSpan = (typeof FOCUS_SPANS)[number];

export const FOCUS_SPAN_LABELS: Record<FocusSpan, string> = {
  today: "Just today",
  "3d": "Next 3 days",
  week: "This week",
  open: "Until I clear it",
};

const SPAN_DAYS: Record<Exclude<FocusSpan, "open">, number> = {
  today: 1,
  "3d": 3,
  week: 7,
};

export type FocusFields = {
  focusedAt: Date | null;
  focusUntil: Date | null;
};

/** The last focused day for a span started on `today`; null is open-ended. */
export function focusUntilFor(span: FocusSpan, today: Date): Date | null {
  if (span === "open") return null;
  return addDays(today, SPAN_DAYS[span] - 1);
}

/** In focus once set, until the day after `focusUntil` begins. */
export function isFocusActive(
  item: FocusFields,
  today: Date,
  mode: CalendarMode = "local"
): boolean {
  if (!item.focusedAt) return false;
  if (!item.focusUntil) return true;
  return calendarDaysBetween(item.focusUntil, today, mode) >= 0;
}

/** "Last day", "3 days left", or "Ongoing" — what a focus pill says about time. */
export function focusRemainingLabel(
  item: FocusFields,
  today: Date,
  mode: CalendarMode = "local"
): string | null {
  if (!isFocusActive(item, today, mode)) return null;
  if (!item.focusUntil) return "Ongoing";
  const left = calendarDaysBetween(item.focusUntil, today, mode);
  // Today counts as one of the days left, matching how a span is chosen.
  return left === 0 ? "Last day" : `${left + 1} days left`;
}
