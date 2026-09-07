import { format, startOfDay, subDays } from "date-fns";
import {
  groupCompletionDateKeys,
  isHabitDueOn,
  isSameCalendarDay,
  toDateOnlyString,
} from "@/lib/dates";

type CommitmentLog = {
  entityType: "TASK" | "DAILY_TASK";
  entityId: string;
  completedOn: Date;
};

type HabitCommitment = {
  id: string;
  weekdays: number[];
  createdAt: Date;
};

type TaskCommitment = {
  id: string;
  projectId?: string | null;
  dueDate: Date | null;
  createdAt: Date;
};

type MomentumSource = {
  completed: number;
  total: number;
};

export type MomentumDay = {
  date: string;
  label: string;
  fullLabel: string;
  completed: number;
  total: number;
  ratio: number | null;
  isComplete: boolean;
  isToday: boolean;
  habits: MomentumSource;
  inbox: MomentumSource;
  projects: MomentumSource;
};

export type MomentumInfo = {
  streak: number;
  days: MomentumDay[];
  today: MomentumDay;
};

/**
 * Scores each calendar day from the commitments that were actually due that
 * day. Habits follow their schedules (including carried-over occurrences).
 * Dated Inbox/project tasks participate on their due date; undated tasks
 * participate when they are completed, so real work is never invisible.
 */
export function calculateMomentumInfo(
  habits: HabitCommitment[],
  tasks: TaskCommitment[],
  logs: CommitmentLog[],
  today: Date,
  visibleDays = 7
): MomentumInfo {
  const completionKeysByHabit = groupCompletionDateKeys(
    logs.filter((log) => log.entityType === "DAILY_TASK")
  );
  const completionsByDay = new Map<string, Set<string>>();
  const firstTaskCompletionById = new Map<string, Date>();
  for (const log of logs) {
    const key = toDateOnlyString(log.completedOn);
    const completed = completionsByDay.get(key) ?? new Set<string>();
    completed.add(`${log.entityType}:${log.entityId}`);
    completionsByDay.set(key, completed);

    if (log.entityType === "TASK") {
      const completedDay = startOfDay(log.completedOn);
      const previous = firstTaskCompletionById.get(log.entityId);
      if (!previous || completedDay < previous) {
        firstTaskCompletionById.set(log.entityId, completedDay);
      }
    }
  }

  function getDay(date: Date): MomentumDay {
    const day = startOfDay(date);
    const key = toDateOnlyString(day);
    const dueHabits = habits.filter((habit) =>
      isHabitDueOn(habit.weekdays, day, {
        createdAt: habit.createdAt,
        completedOnKeys: completionKeysByHabit.get(habit.id),
      })
    );
    const dueTasks = tasks.filter(
      (task) =>
        task.dueDate &&
        startOfDay(task.createdAt) <= day &&
        isSameCalendarDay(task.dueDate, day) &&
        // Finishing a task ahead of its deadline earns credit on the day it
        // was finished, rather than creating a missed commitment later.
        (!firstTaskCompletionById.get(task.id) ||
          firstTaskCompletionById.get(task.id)! >= day)
    );
    const completions = completionsByDay.get(key) ?? new Set<string>();
    const dueTaskIds = new Set(dueTasks.map((task) => task.id));
    const completedUndatedOrOffScheduleTasks = tasks.filter(
      (task) =>
        !dueTaskIds.has(task.id) && completions.has(`TASK:${task.id}`)
    );
    const taskCommitments = [
      ...dueTasks,
      ...completedUndatedOrOffScheduleTasks,
    ];
    const habitSource: MomentumSource = {
      completed: dueHabits.filter((habit) =>
        completions.has(`DAILY_TASK:${habit.id}`)
      ).length,
      total: dueHabits.length,
    };
    const sourceForTasks = (projectId: string | null): MomentumSource => {
      const sourceTasks = taskCommitments.filter(
        (task) => (task.projectId ?? null) === projectId
      );
      return {
        completed: sourceTasks.filter((task) =>
          completions.has(`TASK:${task.id}`)
        ).length,
        total: sourceTasks.length,
      };
    };
    const inbox = sourceForTasks(null);
    const projects: MomentumSource = {
      completed: taskCommitments.filter(
        (task) => task.projectId !== null && task.projectId !== undefined &&
          completions.has(`TASK:${task.id}`)
      ).length,
      total: taskCommitments.filter(
        (task) => task.projectId !== null && task.projectId !== undefined
      ).length,
    };
    const completed =
      habitSource.completed + inbox.completed + projects.completed;
    const total = habitSource.total + inbox.total + projects.total;

    return {
      date: key,
      label: format(day, "EEEEE"),
      fullLabel: format(day, "EEE, d MMM"),
      completed,
      total,
      ratio: total === 0 ? null : completed / total,
      isComplete: total > 0 && completed === total,
      isToday: isSameCalendarDay(day, today),
      habits: habitSource,
      inbox,
      projects,
    };
  }

  const earliestCommitment = [
    ...habits.map((habit) => startOfDay(habit.createdAt)),
    ...tasks.flatMap((task) => (task.dueDate ? [startOfDay(task.dueDate)] : [])),
    ...logs
      .filter((log) => log.entityType === "TASK")
      .map((log) => startOfDay(log.completedOn)),
  ].reduce<Date | null>(
    (earliest, date) => (!earliest || date < earliest ? date : earliest),
    null
  );

  let streak = 0;
  if (earliestCommitment) {
    let cursor = startOfDay(today);
    while (cursor >= earliestCommitment) {
      const day = getDay(cursor);
      if (day.total === 0) {
        cursor = subDays(cursor, 1);
        continue;
      }
      if (!day.isComplete) {
        if (day.isToday) {
          cursor = subDays(cursor, 1);
          continue;
        }
        break;
      }
      streak += 1;
      cursor = subDays(cursor, 1);
    }
  }

  const days = Array.from({ length: visibleDays }, (_, index) =>
    getDay(subDays(today, visibleDays - index - 1))
  );

  return { streak, days, today: days.at(-1) ?? getDay(today) };
}
