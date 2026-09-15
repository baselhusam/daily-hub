"use client";

import * as React from "react";
import Link from "next/link";
import type { DashboardData, DashboardTask } from "@/lib/dashboard";
import { calendarDayKey, formatLogDay, isOverdue, type CalendarMode } from "@/lib/dates";
import { formatEstimate } from "@/lib/streak-utils";
import { BrandMark } from "@/components/brand-mark";
import { cn, sortInboxLog } from "@/lib/utils";
import { CardHeading, TodayCard } from "./today-card";
import { TaskComposer, type ComposerTask } from "./task-composer";
import { duePillFor, firstNoteLine, taskMeta } from "./project-group";
import { TodayTaskRow } from "./today-task-row";

type InboxCardProps = {
  tasks: DashboardTask[];
  projects: DashboardData["projects"];
  today: Date;
  mode: CalendarMode;
  getDone: (id: string, fallback: boolean) => boolean;
  onToggle: (id: string, currentlyDone: boolean) => void;
  onError: (message: string) => void;
  /** Ask the page to focus the capture bar (with Inbox as the target). */
  onCapture: () => void;
  /** Inbox-only filter: show the whole log grouped by day. */
  expanded?: boolean;
  className?: string;
};

function groupByDay<T extends { completedAt: Date | null }>(
  tasks: T[],
  today: Date,
  mode: CalendarMode
) {
  const groups: Array<{ key: string; label: string; tasks: T[] }> = [];
  const index = new Map<string, number>();
  for (const task of tasks) {
    const when = task.completedAt ?? today;
    const key = calendarDayKey(when, mode);
    const at = index.get(key);
    if (at === undefined) {
      index.set(key, groups.length);
      groups.push({ key, label: formatLogDay(when, today, mode), tasks: [task] });
    } else {
      groups[at].tasks.push(task);
    }
  }
  return groups;
}

/** Open items shown in the rail before the card defers to the Inbox view. */
const RAIL_OPEN_CAP = 6;

/**
 * Unfiled tasks. On Today it shows the first few open ones plus anything
 * finished today; with the Inbox filter on it becomes the full ledger,
 * grouped by day.
 */
export function InboxCard({
  tasks,
  projects,
  today,
  mode,
  getDone,
  onToggle,
  onError,
  onCapture,
  expanded = false,
  className,
}: InboxCardProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const visible = sortInboxLog(
    tasks.map((task) => {
      const done = getDone(task.id, task.done);
      return { ...task, done, completedAt: done ? (task.completedAt ?? today) : null };
    })
  );
  const allOpen = visible.filter((task) => !task.done);
  const openTasks = expanded ? allOpen : allOpen.slice(0, RAIL_OPEN_CAP);
  const hiddenOpen = allOpen.length - openTasks.length;
  const doneTasks = visible.filter((task) =>
    expanded ? task.done : task.done && (task.doneToday || getDone(task.id, task.done) !== task.done)
  );
  const doneGroups = expanded
    ? groupByDay(doneTasks, today, mode)
    : doneTasks.length > 0
      ? [{ key: "today", label: "Today", tasks: doneTasks }]
      : [];
  const olderDone = tasks.filter((task) => task.done && !task.doneToday).length;
  const isEmpty = openTasks.length === 0 && doneTasks.length === 0;
  const label = expanded
    ? openTasks.length > 0 && doneTasks.length > 0
      ? `${openTasks.length} open · ${doneTasks.length} finished`
      : openTasks.length > 0
        ? `${openTasks.length} open`
        : `${doneTasks.length} finished`
    : allOpen.length > 0
      ? `${allOpen.length} unfiled`
      : "unfiled";

  function renderTask(task: (typeof visible)[number]) {
    if (editingId === task.id) {
      const editable: ComposerTask = {
        id: task.id,
        title: task.title,
        notes: task.notes,
        projectId: null,
        dueDate: task.dueDate,
        estimatedMinutes: task.estimatedMinutes,
      };
      return (
        <div key={task.id} className="mx-3 my-1">
          <TaskComposer
            today={today}
            projectId={null}
            task={editable}
            projects={projects}
            onClose={() => setEditingId(null)}
            onError={onError}
          />
        </div>
      );
    }
    return (
      <TodayTaskRow
        key={task.id}
        compact
        task={{
          id: task.id,
          title: task.title,
          note: firstNoteLine(task.notes),
          meta: taskMeta(task, task.done, today, mode),
          estimate: formatEstimate(task.estimatedMinutes),
          due: task.done ? null : duePillFor(task.dueDate, today, mode),
          done: task.done,
          overdue: !task.done && isOverdue(task.dueDate, today, mode),
        }}
        onToggle={() => onToggle(task.id, task.done)}
        onEdit={() => setEditingId(task.id)}
      />
    );
  }

  return (
    <TodayCard className={cn("overflow-hidden", className)} aria-labelledby="inbox-heading">
      <div className="flex items-center justify-between gap-3 border-b border-rule-soft px-4 pt-[13px] pb-[11px]">
        <div className="min-w-0">
          <CardHeading id="inbox-heading">Inbox</CardHeading>
          {expanded ? (
            <p className="mt-0.5 text-[11.5px] text-faint">Unfiled, from the start</p>
          ) : null}
        </div>
        <span className="text-[11.5px] text-faint tabular-nums">{label}</span>
      </div>
      {isEmpty ? (
        <div className="flex flex-col items-center gap-[9px] px-5 pt-[26px] pb-6 text-center">
          <BrandMark size={30} ghost className="text-foreground opacity-[0.28]" />
          <span className="text-[13.5px] font-semibold">Inbox clear</span>
          <span className="max-w-[26ch] text-[12.5px] leading-[1.5] text-muted-foreground">
            Anything you capture without a project lands here.
          </span>
          <button
            type="button"
            onClick={onCapture}
            className="mt-0.5 inline-flex h-[30px] items-center rounded-[7px] border border-border bg-card px-[11px] text-[12.5px] font-medium text-foreground transition-colors duration-[120ms] hover:border-border-strong"
          >
            Capture something
          </button>
        </div>
      ) : (
        <div className="pt-1 pb-1.5">
          {openTasks.map(renderTask)}
          {hiddenOpen > 0 ? (
            <Link
              href="/?project=inbox"
              className="block py-1.5 pr-4 pl-[45px] text-[12.5px] text-faint transition-colors duration-[120ms] hover:text-signal"
            >
              {hiddenOpen} more unfiled →
            </Link>
          ) : null}
          {doneGroups.map((group) => (
            <div key={group.key} className={openTasks.length > 0 ? "mt-1" : undefined}>
              {expanded ? (
                <div className="px-4 pt-2.5 pb-1 text-[10.5px] font-bold tracking-[0.08em] text-faint uppercase">
                  {group.label}
                </div>
              ) : null}
              {group.tasks.map(renderTask)}
            </div>
          ))}
          {!expanded ? (
            <button
              type="button"
              onClick={onCapture}
              className="block w-full py-1.5 pr-4 pl-[45px] text-left text-[12.5px] text-faint transition-colors duration-[120ms] hover:text-signal"
            >
              Capture another →
            </button>
          ) : null}
          {!expanded && olderDone > 0 ? (
            <Link
              href="/?project=inbox"
              className="block py-1 pr-4 pl-[45px] text-[12.5px] text-faint transition-colors duration-[120ms] hover:text-signal"
            >
              {olderDone} finished earlier →
            </Link>
          ) : null}
        </div>
      )}
    </TodayCard>
  );
}
