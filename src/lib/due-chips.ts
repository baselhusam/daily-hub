import { addDays, format } from "date-fns";
import { toDateInputValue } from "@/lib/dates";

export type DueChip = { label: string; value: string };
export type EstimateChip = { label: string; minutes: number };

/**
 * The four one-tap due dates in a task composer: today, tomorrow, the end of
 * the working week, and a week out. The third chip is this Friday when that
 * is still at least two days away; otherwise (Thu–Sun) it rolls to next
 * Monday so it never duplicates "Tomorrow".
 */
export function dueChipsFor(today: Date): DueChip[] {
  const dow = today.getDay(); // 0 = Sunday
  const toFriday = (5 - dow + 7) % 7;
  const toMonday = (1 - dow + 7) % 7 || 7;
  const third =
    toFriday >= 2
      ? { label: "Fri", offset: toFriday }
      : { label: "Mon", offset: toMonday };
  return [
    { label: "Today", value: toDateInputValue(today) },
    { label: "Tomorrow", value: toDateInputValue(addDays(today, 1)) },
    { label: third.label, value: toDateInputValue(addDays(today, third.offset)) },
    { label: "Next week", value: toDateInputValue(addDays(today, 7)) },
  ];
}

export const ESTIMATE_CHIPS: EstimateChip[] = [
  { label: "15m", minutes: 15 },
  { label: "30m", minutes: 30 },
  { label: "1h", minutes: 60 },
  { label: "2h", minutes: 120 },
];

/** Short label for a picked date that is not one of the chips. */
export function formatCustomDue(value: string, today: Date): string {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === today.getFullYear()
    ? format(date, "MMM d")
    : format(date, "MMM d, yyyy");
}
