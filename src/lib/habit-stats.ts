import { addDays, startOfDay, startOfWeek, subDays } from "date-fns";
import { isScheduledOn, toDateOnlyString } from "@/lib/dates";
import type { WeekStart } from "@/lib/settings";

/**
 * Pure helpers behind the Habits page: per-habit chains and 14-day strips,
 * plus the four summary tiles (kept today, average consistency, longest
 * chain, at risk). Plain rows in, plain numbers out, so they unit-test
 * without Prisma.
 */

export type HabitLike = {
  id: string;
  weekdays: number[];
  createdAt: Date;
  isActive: boolean;
};

export type CompletionLike = { entityId: string; completedOn: Date };

export type StripCell = "kept" | "missed" | "off" | "today-done" | "today-open";

/** Completed-day keys per habit, for O(1) lookups below. */
export function completionKeys(
  completions: CompletionLike[]
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const log of completions) {
    const key = toDateOnlyString(log.completedOn);
    const set = map.get(log.entityId);
    if (set) set.add(key);
    else map.set(log.entityId, new Set([key]));
  }
  return map;
}

/**
 * The current chain: consecutive scheduled days completed, counting back
 * from today. An unfinished today does not break it — the chain is judged
 * from yesterday until today is done. Off days are skipped, not broken.
 */
export function currentChain(
  habit: HabitLike,
  keys: Set<string> | undefined,
  today: Date,
  lookbackDays = 730
): number {
  if (habit.weekdays.length === 0) return 0;
  const created = startOfDay(habit.createdAt);
  let chain = 0;
  if (isScheduledOn(habit.weekdays, today) && keys?.has(toDateOnlyString(today))) {
    chain += 1;
  }
  for (let back = 1; back <= lookbackDays; back += 1) {
    const day = subDays(today, back);
    if (day < created) break;
    if (!isScheduledOn(habit.weekdays, day)) continue;
    if (keys?.has(toDateOnlyString(day))) chain += 1;
    else break;
  }
  return chain;
}

/** One cell per day for the trailing `length` days, ending today. */
export function strip(
  habit: HabitLike,
  keys: Set<string> | undefined,
  today: Date,
  length = 14
): StripCell[] {
  return Array.from({ length }, (_, index) => {
    const day = subDays(today, length - 1 - index);
    const isToday = index === length - 1;
    if (!isScheduledOn(habit.weekdays, day) || day < startOfDay(habit.createdAt)) {
      return "off";
    }
    const done = keys?.has(toDateOnlyString(day)) ?? false;
    if (isToday) return done ? "today-done" : "today-open";
    return done ? "kept" : "missed";
  });
}

/**
 * Completion rate over a trailing window, excluding today (still open).
 * Null until the habit has had a scheduled day in the window.
 */
export function consistency(
  habit: HabitLike,
  keys: Set<string> | undefined,
  today: Date,
  windowDays = 14
): { rate: number | null; scheduled: number; missed: number } {
  const created = startOfDay(habit.createdAt);
  let scheduled = 0;
  let done = 0;
  for (let back = 1; back <= windowDays; back += 1) {
    const day = subDays(today, back);
    if (day < created) break;
    if (!isScheduledOn(habit.weekdays, day)) continue;
    scheduled += 1;
    if (keys?.has(toDateOnlyString(day))) done += 1;
  }
  return {
    rate: scheduled === 0 ? null : Math.round((done / scheduled) * 100),
    scheduled,
    missed: scheduled - done,
  };
}

/**
 * Consistency per week across all active habits for the trailing `weeks`
 * weeks, oldest first. The current week counts days through yesterday, so
 * an unfinished afternoon never reads as a dip.
 */
export function weeklyConsistency(
  habits: HabitLike[],
  keyMap: Map<string, Set<string>>,
  today: Date,
  weekStartsOn: WeekStart,
  weeks = 12
): Array<{ rate: number | null; scheduled: number }> {
  const thisWeek = startOfWeek(today, { weekStartsOn });
  const active = habits.filter((habit) => habit.isActive);
  return Array.from({ length: weeks }, (_, index) => {
    const start = subDays(thisWeek, (weeks - 1 - index) * 7);
    const end = addDays(start, 6);
    let scheduled = 0;
    let done = 0;
    for (const habit of active) {
      const created = startOfDay(habit.createdAt);
      for (let day = start; day <= end; day = addDays(day, 1)) {
        if (day >= today) break;
        if (day < created) continue;
        if (!isScheduledOn(habit.weekdays, day)) continue;
        scheduled += 1;
        if (keyMap.get(habit.id)?.has(toDateOnlyString(day))) done += 1;
      }
    }
    return { rate: scheduled === 0 ? null : Math.round((done / scheduled) * 100), scheduled };
  });
}

/**
 * The chain length a habit had at the end of each of the trailing `points`
 * weeks — the little line under "Longest chain".
 */
export function chainHistory(
  habit: HabitLike,
  keys: Set<string> | undefined,
  today: Date,
  points = 12
): number[] {
  return Array.from({ length: points }, (_, index) => {
    const at = subDays(today, (points - 1 - index) * 7);
    return currentChain(habit, keys, at);
  });
}
