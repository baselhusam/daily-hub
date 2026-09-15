"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import type { DashboardData, DashboardTaskItem } from "@/lib/dashboard";
import { getDueMeta } from "@/lib/due-meta";
import { daysUntil, formatEstimate } from "@/lib/streak-utils";
import { formatAddedAgo, formatCompletedAgo, isOverdue, type CalendarMode } from "@/lib/dates";
import { shipLabel } from "@/lib/today-insights";
import { getProjectStatus } from "@/lib/status";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { cn, sortInboxLog } from "@/lib/utils";
import { CaptureGlyph, TodayCard } from "./today-card";
import { TaskComposer, type ComposerTask } from "./task-composer";
import { TodayTaskRow, type DuePill } from "./today-task-row";

/** Open tasks shown per project before the list defers to the project page. */
export const TODAY_TASK_CAP = 5;

const BODY_TRANSITION = { duration: 0.24, ease: [0.2, 0.8, 0.3, 1] as const };
const CHEVRON_SPRING = { type: "spring" as const, stiffness: 420, damping: 32 };
const ENTRANCE_TRANSITION = { duration: 0.22, ease: [0.2, 0.8, 0.3, 1] as const };
const AUTO_FOLD_DELAY_MS = 900;

const STATUS_PILL: Record<string, string> = {
  signal: "bg-signal-soft text-signal",
  warn: "bg-warn-wash text-warn",
  done: "bg-done-wash text-done",
  muted: "bg-paper text-muted-foreground",
};

/** Fade+slide entrance, staggered by `index` (capped) and skipped under reduced motion. */
export function AnimatedRow({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...ENTRANCE_TRANSITION, delay: Math.min(index, 6) * 0.03 }}
    >
      {children}
    </motion.div>
  );
}

export function duePillFor(
  dueDate: Date | null,
  today: Date,
  mode: CalendarMode
): DuePill | null {
  const meta = getDueMeta(dueDate, today, mode);
  if (!meta || !dueDate) return null;
  const tone: DuePill["tone"] = isOverdue(dueDate, today, mode)
    ? "late"
    : meta.label === "Today"
      ? "today"
      : "muted";
  return { label: meta.label, tone };
}

/**
 * Order for the open list on Today: what has slipped, then what is due
 * today, then dated work soonest-first, then undated work oldest-first.
 */
export function sortOpenForToday<
  T extends { dueDate: Date | null; createdAt: Date }
>(tasks: T[], today: Date, mode: CalendarMode): T[] {
  const rank = (task: T) =>
    daysUntil(task.dueDate, today, mode) ?? Number.POSITIVE_INFINITY;
  return [...tasks].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra < rb ? -1 : 1;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

export function firstNoteLine(notes: string | null): string | undefined {
  if (!notes) return undefined;
  const line = notes.trim().split("\n")[0]?.trim();
  if (!line) return undefined;
  return line.length > 96 ? `${line.slice(0, 95)}…` : line;
}

export function taskMeta(
  task: Pick<DashboardTaskItem, "createdAt" | "completedAt">,
  done: boolean,
  today: Date,
  mode: CalendarMode
): string | undefined {
  const added = formatAddedAgo(task.createdAt, today, mode)?.replace(/^Added/, "added");
  if (!done) return added;
  const finished = formatCompletedAgo(task.completedAt ?? today, today, mode)?.replace(
    /^Done/,
    "done"
  );
  return [added, finished].filter(Boolean).join(" · ") || undefined;
}

type ProjectGroupProps = {
  project: DashboardData["projects"][number];
  projects: DashboardData["projects"];
  index: number;
  today: Date;
  mode: CalendarMode;
  /** The sidebar filter is on this project: show every task, no cap. */
  expanded: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onToggleTask: (taskId: string, currentlyDone: boolean) => void;
  getDone: (id: string, fallback: boolean) => boolean;
  onError: (message: string) => void;
};

export function ProjectGroup({
  project,
  projects,
  index,
  today,
  mode,
  expanded,
  collapsed,
  onToggleCollapsed,
  onToggleTask,
  getDone,
  onError,
}: ProjectGroupProps) {
  const reducedMotion = useReducedMotion();
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  // "N more open" lifts the cap in place; adding a task does too, so the new
  // row is never swallowed by it.
  const [revealAll, setRevealAll] = React.useState(false);

  const visibleTasks = sortInboxLog(
    project.tasks.map((task) => {
      const done = getDone(task.id, task.done);
      return { ...task, done, completedAt: done ? (task.completedAt ?? today) : null };
    })
  );
  const openTasks = sortOpenForToday(
    visibleTasks.filter((task) => !task.done),
    today,
    mode
  );
  // Finished work stays visible only for the day it was finished (or while an
  // optimistic toggle is in flight), so the card reads as today's ledger.
  const doneTodayTasks = visibleTasks.filter(
    (task) => task.done && (task.doneToday || getDone(task.id, task.done) !== task.done)
  );
  const cappedOpen =
    expanded || revealAll ? openTasks : openTasks.slice(0, TODAY_TASK_CAP);
  const hiddenOpen = openTasks.length - cappedOpen.length;
  const canFold = !expanded && revealAll && openTasks.length > TODAY_TASK_CAP;
  const openCount = openTasks.length;
  const total = openCount + project.doneCount;
  const pct = total === 0 ? 0 : Math.round((project.doneCount / total) * 100);
  const status = getProjectStatus(project.status);
  const ship = shipLabel(project.dueDate, today);
  const meta = [openCount === 1 ? "1 open" : `${openCount} open`, ship]
    .filter(Boolean)
    .join(" · ");

  // Hold the card open for a beat after its last open task is checked so the
  // checkbox animation lands before the auto-collapse folds it away.
  const [foldPending, setFoldPending] = React.useState(false);
  const prevOpenCountRef = React.useRef(openCount);
  React.useEffect(() => {
    const prev = prevOpenCountRef.current;
    prevOpenCountRef.current = openCount;
    if (prev > 0 && openCount === 0 && collapsed) {
      setFoldPending(true);
      const timer = setTimeout(() => setFoldPending(false), AUTO_FOLD_DELAY_MS);
      return () => clearTimeout(timer);
    }
    if (openCount > 0) setFoldPending(false);
  }, [openCount, collapsed]);
  const displayCollapsed = foldPending ? false : collapsed;
  const bodyId = `project-body-${project.id}`;

  function renderTask(task: (typeof visibleTasks)[number], rowIndex: number) {
    if (editingId === task.id) {
      const editable: ComposerTask = {
        id: task.id,
        title: task.title,
        notes: task.notes,
        projectId: task.projectId,
        dueDate: task.dueDate,
        estimatedMinutes: task.estimatedMinutes,
      };
      return (
        <div key={task.id} className="mx-3 my-1">
          <TaskComposer
            today={today}
            projectId={project.id}
            task={editable}
            projects={projects}
            onClose={() => setEditingId(null)}
            onError={onError}
          />
        </div>
      );
    }
    return (
      <AnimatedRow key={task.id} index={rowIndex}>
        <TodayTaskRow
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
          onToggle={() => onToggleTask(task.id, task.done)}
          onEdit={() => {
            setComposerOpen(false);
            setEditingId(task.id);
          }}
        />
      </AnimatedRow>
    );
  }

  let rowIndex = 0;
  const body = (
    <div className="border-t border-rule-soft pt-1 pb-1.5">
      {cappedOpen.map((task) => renderTask(task, rowIndex++))}
      {hiddenOpen > 0 || canFold ? (
        <button
          type="button"
          onClick={() => setRevealAll(!revealAll)}
          className="block w-full py-1.5 pr-4 pl-[45px] text-left text-[12.5px] text-faint transition-colors duration-[120ms] hover:text-signal"
        >
          {hiddenOpen > 0 ? `${hiddenOpen} more open ↓` : "Show fewer ↑"}
        </button>
      ) : null}
      {doneTodayTasks.map((task) => renderTask(task, rowIndex++))}
      {composerOpen ? (
        <div className="mx-2.5 mt-1 mb-1">
          <TaskComposer
            today={today}
            projectId={project.id}
            onClose={() => setComposerOpen(false)}
            onSaved={() => setRevealAll(true)}
            onError={onError}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setComposerOpen(true);
          }}
          className="group/add mt-0.5 flex w-full items-center gap-[11px] px-4 pt-[7px] pb-2 text-left text-[13px] text-faint transition-colors duration-[120ms] hover:bg-canvas-sunk hover:text-foreground"
        >
          <CaptureGlyph className="group-hover/add:border-faint group-hover/add:text-foreground" />
          <span>
            Add task to{" "}
            <span className="text-muted-foreground group-hover/add:text-foreground">
              {project.name}
            </span>
          </span>
        </button>
      )}
    </div>
  );

  return (
    <AnimatedRow index={index}>
      <TodayCard className="overflow-hidden" id={`project-${project.id}`}>
        <div
          role="button"
          tabIndex={0}
          aria-expanded={!displayCollapsed}
          aria-controls={bodyId}
          onClick={onToggleCollapsed}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onToggleCollapsed();
            }
          }}
          className="group flex cursor-pointer items-center gap-[11px] px-4 pt-[13px] pb-3 outline-none transition-colors duration-[120ms] hover:bg-canvas-sunk focus-visible:bg-canvas-sunk"
        >
          <EntityAvatar
            name={project.name}
            color={project.color}
            logoUrl={project.logoUrl}
            iconKey={project.iconKey}
            size={28}
            rounded="lg"
          />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 truncate text-[14.5px] font-semibold tracking-[-0.01em]">
                {project.name}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-[5px] px-[7px] py-px text-[10.5px] font-bold tracking-[0.02em]",
                  STATUS_PILL[status.tone]
                )}
              >
                {status.label}
              </span>
            </div>
            <div className="mt-[3px] truncate text-[11.5px] text-faint">{meta}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="text-[12px] font-semibold text-muted-foreground tabular-nums">
              {pct}%
            </span>
            <span className="hidden h-1 w-[88px] overflow-hidden rounded-full bg-track sm:block">
              <span
                className="block h-full rounded-full transition-[width] duration-300 ease-[cubic-bezier(0.2,0.8,0.3,1)]"
                style={{ width: `${pct}%`, backgroundColor: project.color ?? "var(--signal)" }}
              />
            </span>
            <span
              aria-hidden
              className="grid h-[26px] w-[26px] place-items-center rounded-[7px] text-hairline transition-colors duration-[120ms] group-hover:text-foreground"
            >
              <motion.span
                className="grid place-items-center"
                animate={reducedMotion ? undefined : { rotate: displayCollapsed ? -90 : 0 }}
                style={reducedMotion ? { rotate: displayCollapsed ? "-90deg" : "0deg" } : undefined}
                transition={CHEVRON_SPRING}
              >
                <ChevronDown className="h-[15px] w-[15px]" />
              </motion.span>
            </span>
          </div>
        </div>

        {reducedMotion ? (
          !displayCollapsed ? <div id={bodyId}>{body}</div> : null
        ) : (
          <AnimatePresence initial={false}>
            {!displayCollapsed && (
              <motion.div
                key="body"
                id={bodyId}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={BODY_TRANSITION}
                style={{ overflow: "hidden" }}
              >
                {body}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </TodayCard>
    </AnimatedRow>
  );
}
