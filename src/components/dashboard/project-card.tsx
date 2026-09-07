"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import type { DashboardData } from "@/lib/dashboard";
import { StatusChip } from "@/components/ui/option-mark";
import { daysUntil, formatEstimate } from "@/lib/streak-utils";
import { getDueMeta, getDeadlineColor } from "@/lib/due-meta";
import {
  calendarDayKey,
  formatAddedAgo,
  formatCompletedAgo,
  formatLogDay,
  type CalendarMode,
} from "@/lib/dates";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { SurfaceCard } from "@/components/ui/surface-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TaskRow } from "@/components/ui/task-row";
import { CreateTaskDialog } from "./create-task-dialog";
import { sortInboxLog } from "@/lib/utils";

export type EditableTask = {
  id: string;
  title: string;
  notes: string | null;
  projectId: string | null;
  dueDate: Date | null;
  estimatedMinutes: number | null;
};

const ROW_ENTRANCE_TRANSITION = { duration: 0.22, ease: [0.2, 0.8, 0.3, 1] as const };
const BODY_TRANSITION = { duration: 0.24, ease: [0.2, 0.8, 0.3, 1] as const };
const CHEVRON_SPRING = { type: "spring" as const, stiffness: 420, damping: 32 };
const AUTO_FOLD_DELAY_MS = 900;

/**
 * Fade+slide entrance shared by project cards and task rows, staggered by
 * `index` (capped at 6 steps) and skipped entirely under reduced motion.
 */
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
      transition={{ ...ROW_ENTRANCE_TRANSITION, delay: Math.min(index, 6) * 0.03 }}
    >
      {children}
    </motion.div>
  );
}

export function taskMetaLabel(
  task: Pick<DashboardData["inboxTasks"][number], "createdAt" | "completedAt">,
  done: boolean,
  today: Date,
  mode: CalendarMode
) {
  const parts = [
    formatAddedAgo(task.createdAt, today, mode),
    done ? formatCompletedAgo(task.completedAt ?? today, today, mode) : undefined,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function groupLoggedTasks<
  T extends Pick<DashboardData["inboxTasks"][number], "completedAt">
>(tasks: T[], today: Date, mode: CalendarMode) {
  const groups: Array<{
    key: string;
    label: string;
    tasks: T[];
  }> = [];
  const index = new Map<string, number>();

  for (const task of tasks) {
    const when = task.completedAt ?? today;
    const key = calendarDayKey(when, mode);
    const existing = index.get(key);
    if (existing === undefined) {
      index.set(key, groups.length);
      groups.push({
        key,
        label: formatLogDay(when, today, mode),
        tasks: [task],
      });
    } else {
      groups[existing].tasks.push(task);
    }
  }

  return groups;
}

type ProjectCardProps = {
  project: DashboardData["projects"][number];
  index: number;
  today: Date;
  mode: CalendarMode;
  showAllLogs: boolean;
  projects: DashboardData["projects"];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onToggleTask: (taskId: string, currentlyDone: boolean) => void;
  onEditTask: (task: EditableTask) => void;
  getDone: (id: string, fallback: boolean) => boolean;
};

export function ProjectCard({
  project,
  index,
  today,
  mode,
  showAllLogs,
  projects,
  collapsed,
  onToggleCollapsed,
  onToggleTask,
  onEditTask,
  getDone,
}: ProjectCardProps) {
  const reducedMotion = useReducedMotion();
  const dl = daysUntil(project.dueDate, today, mode);
  const visibleTasks = sortInboxLog(
    project.tasks.map((task) => {
      const done = getDone(task.id, task.done);
      return {
        ...task,
        done,
        completedAt: done ? (task.completedAt ?? today) : null,
      };
    })
  );
  const openTasks = visibleTasks.filter((task) => !task.done);
  const loggedTasks = visibleTasks.filter((task) => task.done);
  const visibleLoggedTasks = showAllLogs
    ? loggedTasks
    : loggedTasks.filter(
        (task) => task.doneToday || getDone(task.id, task.done) !== task.done
      );
  const hiddenLoggedCount = loggedTasks.length - visibleLoggedTasks.length;
  const loggedGroups = showAllLogs
    ? groupLoggedTasks(loggedTasks, today, mode)
    : visibleLoggedTasks.length > 0
      ? [{ key: "today", label: "Today", tasks: visibleLoggedTasks }]
      : [];
  const openCount = openTasks.length;
  const openMilestones = project.milestones.filter((m) => !m.done).slice(0, 3);

  // When the last open task in a project is checked, `collapsed` (driven by
  // the auto rule upstream) flips to true on the very next render. Hold the
  // card open for a beat so the checkbox animation is actually seen, then let
  // it fold. Any further toggle (task reopened, or the count changing again)
  // cancels the pending fold via the effect's own cleanup.
  const [foldPending, setFoldPending] = React.useState(false);
  const prevOpenCountRef = React.useRef(openCount);
  React.useEffect(() => {
    const prevOpenCount = prevOpenCountRef.current;
    prevOpenCountRef.current = openCount;
    if (prevOpenCount > 0 && openCount === 0 && collapsed) {
      setFoldPending(true);
      const timer = setTimeout(() => setFoldPending(false), AUTO_FOLD_DELAY_MS);
      return () => clearTimeout(timer);
    }
    if (openCount > 0) setFoldPending(false);
  }, [openCount, collapsed]);

  const displayCollapsed = foldPending ? false : collapsed;
  const bodyId = `project-body-${project.id}`;
  const summaryLine = displayCollapsed
    ? openCount === 0
      ? `${project.doneCount} finished · all clear`
      : `${openCount} open · ${project.doneCount} finished`
    : `${openCount} open${project.doneCount > 0 ? ` · ${project.doneCount} finished` : ""}`;

  let rowIndex = 0;
  const bodyContent = (
    <div className="pt-0.5 pb-1">
      {openTasks.map((task) => {
        const due = getDueMeta(task.dueDate, today, mode);
        const delayIndex = rowIndex++;
        return (
          <AnimatedRow key={task.id} index={delayIndex}>
            <TaskRow
              task={{
                id: task.id,
                title: task.title,
                done: false,
                dueLabel: due?.label,
                dueColor: due?.color,
                estimateLabel: formatEstimate(task.estimatedMinutes),
                metaLabel: formatAddedAgo(task.createdAt, today, mode),
              }}
              onToggle={() => onToggleTask(task.id, false)}
              onEdit={() => onEditTask(task)}
            />
          </AnimatedRow>
        );
      })}
      {loggedGroups.map((group) => (
        <div key={group.key} className={openTasks.length > 0 ? "mt-1" : undefined}>
          {showAllLogs ? (
            <div className="px-4 pt-2.5 pb-1 text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
              {group.label}
            </div>
          ) : null}
          {group.tasks.map((task) => {
            const delayIndex = rowIndex++;
            return (
              <AnimatedRow key={task.id} index={delayIndex}>
                <TaskRow
                  task={{
                    id: task.id,
                    title: task.title,
                    done: true,
                    estimateLabel: formatEstimate(task.estimatedMinutes),
                    metaLabel: taskMetaLabel(task, true, today, mode),
                  }}
                  onToggle={() => onToggleTask(task.id, true)}
                  onEdit={() => onEditTask(task)}
                />
              </AnimatedRow>
            );
          })}
        </div>
      ))}
      {!showAllLogs && hiddenLoggedCount > 0 ? (
        <Link
          href={`/?project=${project.id}`}
          className="block px-4 py-2 text-[12.5px] text-faint transition-colors duration-[120ms] hover:text-signal"
        >
          {hiddenLoggedCount} finished →
        </Link>
      ) : null}
      <CreateTaskDialog
        projects={projects}
        defaultProjectId={project.id}
        trigger={
          <button
            type="button"
            className="w-full py-1.5 pr-4 pl-11 text-left text-[12.5px] text-faint transition-colors duration-[120ms] hover:text-signal"
          >
            + Add task
          </button>
        }
      />
    </div>
  );

  return (
    <AnimatedRow index={index}>
      <SurfaceCard variant="quiet">
        <div className="flex items-start gap-2.5 px-4 pt-3 pb-1.5">
          <EntityAvatar
            name={project.name}
            color={project.color}
            logoUrl={project.logoUrl}
            iconKey={project.iconKey}
            size={22}
          />
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-expanded={!displayCollapsed}
            aria-controls={bodyId}
            className="min-w-0 flex-1 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="min-w-0 truncate text-[14.5px] font-semibold tracking-[-0.015em]">
                {project.name}
              </span>
              {project.status !== "ACTIVE" ? <StatusChip status={project.status} /> : null}
            </div>
            <p className="mt-0.5 text-[12px] text-faint">{summaryLine}</p>
            {displayCollapsed ? (
              <ProgressBar
                value={project.doneCount}
                max={Math.max(1, project.doneCount + openCount)}
                color={project.color ?? undefined}
                height="sm"
                className="mt-1.5 h-0.5 max-w-[220px] rounded-none"
              />
            ) : null}
          </button>
          {dl !== null && (
            <span
              className="shrink-0 pt-0.5 text-[12.5px] font-medium tabular-nums"
              style={{ color: getDeadlineColor(dl) }}
            >
              {dl < 0 ? `${Math.abs(dl)}d late` : `${dl}d`}
            </span>
          )}
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-expanded={!displayCollapsed}
            aria-controls={bodyId}
            aria-label={displayCollapsed ? `Expand ${project.name}` : `Collapse ${project.name}`}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-faint transition-colors duration-150 hover:bg-hover hover:text-foreground"
          >
            <motion.span
              className="grid place-items-center"
              animate={reducedMotion ? undefined : { rotate: displayCollapsed ? -90 : 0 }}
              style={reducedMotion ? { rotate: displayCollapsed ? "-90deg" : "0deg" } : undefined}
              transition={CHEVRON_SPRING}
            >
              <ChevronDown className="h-4 w-4" />
            </motion.span>
          </button>
        </div>

        {!displayCollapsed && openMilestones.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 px-4 pb-1">
            {openMilestones.map((milestone) => {
              const md = daysUntil(milestone.dueDate, today, mode);
              return (
                <span
                  key={milestone.id}
                  className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground"
                >
                  <span
                    className="h-1 w-1 rounded-full"
                    style={{
                      backgroundColor:
                        md !== null && md <= 7 ? "var(--signal)" : "var(--hairline)",
                    }}
                  />
                  {milestone.name}
                  {md !== null && (
                    <span className="text-faint tabular-nums">
                      {md < 0 ? `${Math.abs(md)}d late` : `${md}d`}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        )}

        {reducedMotion ? (
          !displayCollapsed ? (
            <div id={bodyId}>{bodyContent}</div>
          ) : null
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
                {bodyContent}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </SurfaceCard>
    </AnimatedRow>
  );
}
