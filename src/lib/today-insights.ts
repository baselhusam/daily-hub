import { addDays, format, startOfWeek, subDays } from "date-fns";
import {
  calendarDaysBetween,
  isOverdue,
  isScheduledOn,
  toDateOnlyString,
} from "@/lib/dates";

/**
 * Pure helpers behind the Today page's summary widgets — the open-task mix,
 * the "vs a week ago" delta, nudges, the Up next list, and the week-in-review
 * line. They take plain rows so they can be unit-tested without Prisma.
 */

export type OpenMix = {
  overdue: number;
  dueToday: number;
  later: number;
};

type OpenTaskLike = { dueDate: Date | null };

export function openMixOf(tasks: OpenTaskLike[], today: Date): OpenMix {
  let overdue = 0;
  let dueToday = 0;
  for (const task of tasks) {
    if (!task.dueDate) continue;
    if (isOverdue(task.dueDate, today)) overdue += 1;
    else if (calendarDaysBetween(task.dueDate, today) === 0) dueToday += 1;
  }
  return {
    overdue,
    dueToday,
    later: Math.max(0, tasks.length - overdue - dueToday),
  };
}

type TaskHistoryLike = {
  createdAt: Date;
  completedAt: Date | null;
  status: string;
};

/**
 * How many tasks were open at the end of `day` — created on or before it and
 * not yet finished by then. Lets the Open tasks card say "−6" against a week
 * ago without storing daily snapshots.
 */
export function openCountAt(tasks: TaskHistoryLike[], day: Date): number {
  const cutoff = addDays(day, 1).getTime();
  return tasks.filter((task) => {
    if (task.createdAt.getTime() >= cutoff) return false;
    if (task.status !== "DONE") return true;
    // A finished task with no timestamp is treated as finished long ago.
    if (!task.completedAt) return false;
    return task.completedAt.getTime() >= cutoff;
  }).length;
}

export function oldestOverdueDays(tasks: OpenTaskLike[], today: Date): number {
  let oldest = 0;
  for (const task of tasks) {
    if (!task.dueDate || !isOverdue(task.dueDate, today)) continue;
    oldest = Math.max(oldest, -calendarDaysBetween(task.dueDate, today));
  }
  return oldest;
}

export type UpNextItem = {
  id: string;
  label: string;
  projectId: string;
  projectName: string;
  color: string;
  /** Calendar days from today; negative when it has slipped. */
  days: number;
};

type UpNextProject = {
  id: string;
  name: string;
  color: string;
  status: string;
  dueDate: Date | null;
  milestones: Array<{
    id: string;
    name: string;
    dueDate: Date | null;
    done: boolean;
  }>;
};

/**
 * The next few dated commitments across live projects: open milestones plus
 * project ship dates, soonest first. Slipped items sort ahead of upcoming ones
 * so a missed milestone is not hidden by a comfortable one.
 */
export function buildUpNext(
  projects: UpNextProject[],
  today: Date,
  limit = 3
): UpNextItem[] {
  const items: UpNextItem[] = [];
  for (const project of projects) {
    if (project.status === "DONE") continue;
    for (const milestone of project.milestones) {
      if (milestone.done || !milestone.dueDate) continue;
      items.push({
        id: `milestone:${milestone.id}`,
        label: milestone.name,
        projectId: project.id,
        projectName: project.name,
        color: project.color,
        days: calendarDaysBetween(milestone.dueDate, today),
      });
    }
    if (project.dueDate) {
      items.push({
        id: `ship:${project.id}`,
        label: "Ships",
        projectId: project.id,
        projectName: project.name,
        color: project.color,
        days: calendarDaysBetween(project.dueDate, today),
      });
    }
  }
  return items.sort((a, b) => a.days - b.days).slice(0, limit);
}

export function milestonesDueWithin(
  projects: UpNextProject[],
  today: Date,
  days: number
): number {
  let count = 0;
  for (const project of projects) {
    if (project.status === "DONE") continue;
    for (const milestone of project.milestones) {
      if (milestone.done || !milestone.dueDate) continue;
      const distance = calendarDaysBetween(milestone.dueDate, today);
      if (distance >= 0 && distance < days) count += 1;
    }
  }
  return count;
}

type HabitLike = { id: string; weekdays: number[]; createdAt: Date };
type CompletionLike = { entityId: string; completedOn: Date };

/**
 * Habits "kept" this week: every scheduled day so far was completed. Today
 * only counts once it is done — an unfinished afternoon is not a miss yet.
 * `total` counts habits that had at least one scheduled day, so a
 * weekend-only habit does not drag Monday's number down.
 */
export function habitsKeptThisWeek(
  habits: HabitLike[],
  completions: CompletionLike[],
  today: Date
): { kept: number; total: number } {
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const hitKeys = new Set(
    completions.map((c) => `${c.entityId}:${toDateOnlyString(c.completedOn)}`)
  );
  let kept = 0;
  let total = 0;
  for (const habit of habits) {
    let scheduled = 0;
    let hits = 0;
    for (let day = weekStart; day <= today; day = addDays(day, 1)) {
      if (day < habit.createdAt && toDateOnlyString(day) !== toDateOnlyString(habit.createdAt)) {
        continue;
      }
      if (!isScheduledOn(habit.weekdays, day)) continue;
      const hit = hitKeys.has(`${habit.id}:${toDateOnlyString(day)}`);
      const isToday = toDateOnlyString(day) === toDateOnlyString(today);
      if (isToday && !hit) continue;
      scheduled += 1;
      if (hit) hits += 1;
    }
    if (scheduled === 0) continue;
    total += 1;
    if (hits === scheduled) kept += 1;
  }
  return { kept, total };
}

export function formatFocusHours(minutes: number): string {
  if (minutes <= 0) return "0h";
  const hours = minutes / 60;
  if (hours < 1) return `${minutes}m`;
  const rounded = Math.round(hours * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}h`;
}

export function weekReviewLine(input: {
  closed: number;
  closedLastWeek: number;
  habitsKept: number;
  habitsTotal: number;
}): string {
  const { closed, closedLastWeek, habitsKept, habitsTotal } = input;
  if (closed === 0 && habitsKept === 0) {
    return "Fresh week. Nothing logged since Monday yet.";
  }
  const tasks = closed === 1 ? "1 task" : `${closed} tasks`;
  const habits =
    habitsTotal > 0 ? ` and kept ${habitsKept} of ${habitsTotal} habits` : "";
  let trend = "";
  if (closedLastWeek > 0 && closed > closedLastWeek) {
    trend = ` — up from ${closedLastWeek} last week.`;
  } else if (closedLastWeek > 0 && closed < closedLastWeek) {
    trend = ` — ${closedLastWeek - closed} fewer than last week.`;
  } else if (closedLastWeek > 0 && closed === closedLastWeek) {
    trend = " — level with last week.";
  } else {
    trend = ".";
  }
  return `You closed ${tasks}${habits}${trend}`;
}

/** Seven cells for a habit row: one per day ending today. */
export type HabitDot = "off" | "hit" | "miss" | "today-open";

export function habitDots(
  habit: HabitLike,
  completions: CompletionLike[],
  today: Date,
  length = 7
): HabitDot[] {
  const hits = new Set(
    completions
      .filter((c) => c.entityId === habit.id)
      .map((c) => toDateOnlyString(c.completedOn))
  );
  return Array.from({ length }, (_, index) => {
    const day = subDays(today, length - 1 - index);
    if (!isScheduledOn(habit.weekdays, day)) return "off";
    const key = toDateOnlyString(day);
    if (hits.has(key)) return "hit";
    return index === length - 1 ? "today-open" : "miss";
  });
}

/** Completion rate over the trailing window, excluding today (still open). */
export function habitRate(
  habit: HabitLike,
  completions: CompletionLike[],
  today: Date,
  windowDays = 14
): number | null {
  const hits = new Set(
    completions
      .filter((c) => c.entityId === habit.id)
      .map((c) => toDateOnlyString(c.completedOn))
  );
  let scheduled = 0;
  let done = 0;
  for (let back = 1; back <= windowDays; back += 1) {
    const day = subDays(today, back);
    if (day < habit.createdAt) break;
    if (!isScheduledOn(habit.weekdays, day)) continue;
    scheduled += 1;
    if (hits.has(toDateOnlyString(day))) done += 1;
  }
  if (scheduled === 0) return null;
  return Math.round((done / scheduled) * 100);
}

export function shipLabel(dueDate: Date | null, today: Date): string | null {
  if (!dueDate) return null;
  const days = calendarDaysBetween(dueDate, today);
  const when = format(dueDate, "MMM d");
  if (days < 0) return `ships ${when} · ${Math.abs(days)}d late`;
  if (days === 0) return "ships today";
  return `ships ${when} · ${days}d`;
}
