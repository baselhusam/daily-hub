"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toggleMilestone } from "@/app/actions/milestones";
import { toggleTask } from "@/app/actions/tasks";
import { EmptyState } from "@/components/brand-mark";
import { CreateTaskDialog } from "@/components/dashboard/create-task-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { MetricTile } from "@/components/ui/metric-tile";
import { StatusChip } from "@/components/ui/option-mark";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  SurfaceCard,
  SurfaceCardBody,
  SurfaceCardHeader,
} from "@/components/ui/surface-card";
import { TaskRow } from "@/components/ui/task-row";
import { formatAddedAgo, formatDueDate } from "@/lib/dates";
import { getDeadlineColor, getDueMeta } from "@/lib/due-meta";
import { useDisplayDay } from "@/lib/hydration";
import { useOptimisticFlags } from "@/lib/optimistic-toggle";
import type { ProjectDetailData } from "@/lib/project-detail";
import { daysUntil, formatEstimate } from "@/lib/streak-utils";
import { sortInboxLog } from "@/lib/utils";
import { ProjectActivityChart } from "./project-activity-chart";
import { ProjectFormDialog } from "./project-form-dialog";
import { DeleteProjectDialog } from "./delete-project-dialog";

const RANGE_OPTIONS = [
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
] as const;

type Range = (typeof RANGE_OPTIONS)[number]["value"];

function formatHours(minutes: number): string {
  if (minutes === 0) return "0h";
  if (minutes < 60) return `${minutes}m`;
  const hours = minutes / 60;
  return `${hours >= 10 ? Math.round(hours) : Math.round(hours * 10) / 10}h`;
}

function lastActiveLabel(idleDays: number): string {
  if (idleDays >= 99) return "never";
  if (idleDays === 0) return "today";
  if (idleDays === 1) return "yesterday";
  return `${idleDays}d ago`;
}

export function ProjectDetailShell({ data }: { data: ProjectDetailData }) {
  const router = useRouter();
  const { today, mode } = useDisplayDay(data.todayISO);
  const { project, stats, milestones } = data;

  const [range, setRange] = React.useState<Range>(30);
  const [showAllDone, setShowAllDone] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [editingTask, setEditingTask] = React.useState<
    ProjectDetailData["tasks"][number] | null
  >(null);

  const taskFlags = useOptimisticFlags(
    data.tasks.map((task) => ({ id: task.id, value: task.done }))
  );
  const milestoneFlags = useOptimisticFlags(
    milestones.map((milestone) => ({ id: milestone.id, value: milestone.done }))
  );

  const tasks = sortInboxLog(
    data.tasks.map((task) => {
      const done = taskFlags.get(task.id, task.done);
      return {
        ...task,
        done,
        completedAt: done ? (task.completedAt ?? today) : null,
      };
    })
  );
  const openTasks = tasks.filter((task) => !task.done);
  const doneTasks = tasks.filter((task) => task.done);
  const visibleDoneTasks = showAllDone ? doneTasks : doneTasks.slice(0, 5);

  const points = data.activity.slice(-range);
  const rangeTotal = points.reduce((sum, point) => sum + point.count, 0);
  const activeDays = points.filter((point) => point.count > 0).length;
  const busiest = points.reduce(
    (best, point) => (point.count > best.count ? point : best),
    points[0] ?? { count: 0, label: "—" }
  );

  const dl = daysUntil(project.dueDate, today, mode);

  async function runToggleTask(id: string, currentlyDone: boolean) {
    setActionError(null);
    try {
      const result = await taskFlags.run(id, currentlyDone, () => toggleTask(id));
      if (!result.success) {
        setActionError(result.error ?? "Could not update this task. Try again.");
      }
    } catch {
      setActionError("Could not update this task. Try again.");
    }
  }

  async function runToggleMilestone(id: string, currentlyDone: boolean) {
    setActionError(null);
    try {
      const result = await milestoneFlags.run(id, currentlyDone, () =>
        toggleMilestone(id)
      );
      if (!result.success) {
        setActionError(
          result.error ?? "Could not update this milestone. Try again."
        );
      }
    } catch {
      setActionError("Could not update this milestone. Try again.");
    }
  }

  return (
    <div className="page-gutter animate-dh-fade py-[clamp(18px,2.6vw,32px)]">
      <div className="mx-auto flex max-w-[1080px] flex-col gap-4">
        <Link
          href="/projects"
          className="inline-flex w-fit items-center gap-1.5 text-[12.5px] font-medium text-faint transition-colors duration-[120ms] hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All projects
        </Link>

        <ProjectHero
          project={project}
          stats={stats}
          deadlineDays={dl}
          dueLabel={formatDueDate(project.dueDate, today, mode)}
          onEdit={() => setEditing(true)}
          onDelete={() => setConfirmingDelete(true)}
        />

        {actionError ? (
          <p
            role="alert"
            aria-live="polite"
            className="rounded-[10px] border border-destructive/25 bg-destructive-wash px-3.5 py-2.5 text-[13px] text-destructive"
          >
            {actionError}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <MetricTile
            label="Open"
            value={stats.openCount}
            hint={
              stats.overdueCount > 0
                ? `${stats.overdueCount} overdue`
                : "nothing overdue"
            }
          />
          <MetricTile
            label="Finished"
            value={stats.doneCount}
            hint={
              stats.totalCount === 0
                ? "no tasks yet"
                : `${stats.completionPct}% of ${stats.totalCount}`
            }
          />
          <MetricTile
            label="Milestones"
            value={`${stats.milestonesDone}/${stats.milestonesTotal}`}
            hint={stats.milestonesTotal === 0 ? "none set" : "reached"}
          />
          <MetricTile
            label="Focus logged"
            value={formatHours(stats.focusMinutes)}
            hint={`last touched ${lastActiveLabel(stats.idleDays)}`}
          />
        </div>

        {stats.stalled ? (
          <div className="flex items-center gap-2 rounded-[10px] border border-warn-border bg-warn-wash px-3 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-warn" />
            <span className="text-[12.5px] font-medium text-warn">
              {stats.idleDays >= 99
                ? "Never logged activity"
                : `No activity for ${stats.idleDays} days`}{" "}
              · {stats.openCount} open
            </span>
          </div>
        ) : null}

        <SurfaceCard>
          <SurfaceCardHeader className="flex-wrap gap-y-2">
            <div className="min-w-0">
              <h2 className="text-[13.5px] font-semibold tracking-[-0.01em]">
                Completion rhythm
              </h2>
              <p className="mt-0.5 text-[12px] text-faint">
                Tasks this project closed, day by day.
              </p>
            </div>
            <SegmentedControl
              aria-label="Activity timeframe"
              options={RANGE_OPTIONS}
              value={range}
              onChange={(next) => setRange(next as Range)}
            />
          </SurfaceCardHeader>
          <div className="px-1.5 pt-3 sm:px-3">
            <ProjectActivityChart points={points} color={project.color} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-rule-soft px-3 py-2.5 text-[11.5px] text-faint sm:px-4">
            <span className="inline-flex items-center gap-1.5">
              <i
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              {rangeTotal} finished · active on {activeDays} of {range} days
            </span>
            <span className="tabular-nums">
              {busiest.count > 0
                ? `Peak ${busiest.count} on ${busiest.label}`
                : "Nothing logged in this window"}
            </span>
          </div>
        </SurfaceCard>

        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.35fr_1fr]">
          <SurfaceCard>
            <SurfaceCardHeader>
              <h2 className="text-[13.5px] font-semibold tracking-[-0.01em]">
                Tasks
                <span className="ml-2 text-[12px] font-normal text-faint tabular-nums">
                  {stats.openCount} open
                </span>
              </h2>
              <CreateTaskDialog
                projects={data.projectOptions}
                defaultProjectId={project.id}
                trigger={
                  <Button variant="outline" size="sm">
                    Add task
                  </Button>
                }
              />
            </SurfaceCardHeader>

            {tasks.length === 0 ? (
              <EmptyState
                title="No tasks yet"
                description="Add the first piece of work for this project."
              />
            ) : (
              <div className="py-1.5">
                {openTasks.map((task) => {
                  const due = getDueMeta(task.dueDate, today, mode);
                  return (
                    <TaskRow
                      key={task.id}
                      task={{
                        id: task.id,
                        title: task.title,
                        done: false,
                        dueLabel: due?.label,
                        dueColor: due?.color,
                        estimateLabel: formatEstimate(task.estimatedMinutes),
                        metaLabel: formatAddedAgo(task.createdAt, today, mode),
                        note: task.notes ?? undefined,
                      }}
                      onToggle={() => void runToggleTask(task.id, false)}
                      onEdit={() => setEditingTask(task)}
                    />
                  );
                })}

                {doneTasks.length > 0 ? (
                  <>
                    <div className="px-4 pt-3 pb-1 text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
                      Finished
                    </div>
                    {visibleDoneTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={{
                          id: task.id,
                          title: task.title,
                          done: true,
                          estimateLabel: formatEstimate(task.estimatedMinutes),
                          metaLabel: formatAddedAgo(task.createdAt, today, mode),
                        }}
                        onToggle={() => void runToggleTask(task.id, true)}
                        onEdit={() => setEditingTask(task)}
                      />
                    ))}
                    {doneTasks.length > visibleDoneTasks.length ||
                    showAllDone ? (
                      <button
                        type="button"
                        onClick={() => setShowAllDone((prev) => !prev)}
                        className="w-full py-2 pr-4 pl-11 text-left text-[12.5px] text-faint transition-colors duration-[120ms] hover:text-signal"
                      >
                        {showAllDone
                          ? "Show fewer"
                          : `${doneTasks.length - visibleDoneTasks.length} more finished →`}
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>
            )}
          </SurfaceCard>

          <div className="flex flex-col gap-3.5">
            <SurfaceCard>
              <SurfaceCardHeader>
                <h2 className="text-[13.5px] font-semibold tracking-[-0.01em]">
                  Milestones
                  <span className="ml-2 text-[12px] font-normal text-faint tabular-nums">
                    {stats.milestonesDone}/{stats.milestonesTotal}
                  </span>
                </h2>
              </SurfaceCardHeader>
              <SurfaceCardBody className="flex flex-col gap-2 py-3">
                {milestones.length === 0 ? (
                  <p className="py-2 text-[12.5px] text-faint">
                    No milestones yet. Add them from the project editor.
                  </p>
                ) : (
                  milestones.map((milestone) => {
                    const done = milestoneFlags.get(milestone.id, milestone.done);
                    const md = daysUntil(milestone.dueDate, today, mode);
                    return (
                      <div
                        key={milestone.id}
                        className="flex items-center gap-2.5 rounded-md px-1 py-0.5 -mx-1"
                      >
                        <Checkbox
                          checked={done}
                          onCheckedChange={() =>
                            void runToggleMilestone(milestone.id, done)
                          }
                          className="size-[17px]"
                          aria-label={`Toggle ${milestone.name}`}
                        />
                        <span
                          className="min-w-0 flex-1 truncate text-[13.5px] font-medium"
                          style={{
                            color: done
                              ? "var(--muted-foreground)"
                              : "var(--foreground)",
                          }}
                        >
                          {milestone.name}
                        </span>
                        {md !== null && !done ? (
                          <span
                            className="text-[11px] whitespace-nowrap tabular-nums"
                            style={{
                              color:
                                md < 0 ? "var(--destructive)" : "var(--faint)",
                            }}
                          >
                            {md < 0
                              ? `${Math.abs(md)}d late`
                              : md === 0
                                ? "Today"
                                : `${md}d`}
                          </span>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </SurfaceCardBody>
            </SurfaceCard>

            <SurfaceCard>
              <SurfaceCardHeader>
                <h2 className="text-[13.5px] font-semibold tracking-[-0.01em]">
                  Weekly shape
                </h2>
                <span className="text-[11.5px] text-faint">avg per day</span>
              </SurfaceCardHeader>
              <SurfaceCardBody className="py-4">
                <WeekdayBars weekdays={data.weekdays} color={project.color} />
                <p className="mt-3 text-[12px] text-faint">
                  {stats.perWeek > 0
                    ? `About ${stats.perWeek} finished a week over the last 90 days.`
                    : "Nothing logged in the last 90 days."}
                </p>
              </SurfaceCardBody>
            </SurfaceCard>
          </div>
        </div>
      </div>

      <ProjectFormDialog
        project={{
          id: project.id,
          name: project.name,
          description: project.description,
          iconKey: project.iconKey,
          logoUrl: project.logoUrl,
          color: project.rawColor,
          colorSource: project.colorSource,
          dueDate: project.dueDate,
          status: project.status,
          milestones,
        }}
        open={editing}
        onOpenChange={setEditing}
      />

      {editingTask ? (
        <CreateTaskDialog
          projects={data.projectOptions}
          task={{
            id: editingTask.id,
            title: editingTask.title,
            notes: editingTask.notes,
            projectId: editingTask.projectId,
            dueDate: editingTask.dueDate,
            estimatedMinutes: editingTask.estimatedMinutes,
          }}
          open
          onOpenChange={(open) => {
            if (!open) setEditingTask(null);
          }}
        />
      ) : null}

      <DeleteProjectDialog
        project={{
          id: project.id,
          name: project.name,
          logoUrl: project.logoUrl,
          iconKey: project.iconKey,
          color: project.rawColor,
          openCount: stats.openCount,
          milestoneCount: stats.milestonesTotal,
        }}
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        onDeleted={() => router.push("/projects")}
      />
    </div>
  );
}

function ProjectHero({
  project,
  stats,
  deadlineDays,
  dueLabel,
  onEdit,
  onDelete,
}: {
  project: ProjectDetailData["project"];
  stats: ProjectDetailData["stats"];
  deadlineDays: number | null;
  dueLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <SurfaceCard className="p-[18px] sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3.5">
          <EntityAvatar
            name={project.name}
            color={project.rawColor}
            logoUrl={project.logoUrl}
            iconKey={project.iconKey}
            size={52}
            rounded="lg"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-display-lg m-0 text-balance">{project.name}</h1>
              <StatusChip status={project.status} />
            </div>
            {project.description ? (
              <p className="mt-1.5 max-w-[62ch] text-[13.5px] leading-relaxed text-muted-foreground text-pretty">
                {project.description}
              </p>
            ) : null}
            {/* No inline "·" separator: when this wraps on a narrow screen the
                dot strands itself at the end of a line. The gap does the job. */}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-faint">
              {deadlineDays !== null ? (
                <span
                  className="font-semibold tabular-nums"
                  style={{ color: getDeadlineColor(deadlineDays) }}
                >
                  Ships {dueLabel} ·{" "}
                  {deadlineDays < 0
                    ? `${Math.abs(deadlineDays)}d late`
                    : `${deadlineDays}d`}
                </span>
              ) : (
                <span>No ship date</span>
              )}
              <span className="tabular-nums">Running {stats.ageDays}d</span>
            </div>
          </div>
          <div className="flex shrink-0 gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-hairline"
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit project</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-hairline hover:bg-destructive-wash hover:text-destructive"
              onClick={onDelete}
              aria-label={`Delete ${project.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] text-muted-foreground">
              <b className="text-[13px] text-foreground tabular-nums">
                {stats.openCount}
              </b>{" "}
              still open · {stats.doneCount} done
            </span>
            <span className="text-[12px] font-semibold tabular-nums text-muted-foreground">
              {stats.completionPct}%
            </span>
          </div>
          {/* Same rail + tint as the projects grid and Analytics — the accent
              identifies the project without a full-bleed band of colour. */}
          <ProgressBar
            value={stats.completionPct}
            color={project.color}
            height="rail"
            emphasis="tint"
          />
        </div>
      </div>
    </SurfaceCard>
  );
}

function WeekdayBars({
  weekdays,
  color,
}: {
  weekdays: ProjectDetailData["weekdays"];
  color: string;
}) {
  return (
    <div className="flex items-end justify-between gap-1.5">
      {weekdays.map((day) => (
        <div
          key={day.id}
          className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
          title={`${day.name}: ${day.count} avg`}
        >
          <span className="text-[10.5px] text-faint tabular-nums">
            {day.count > 0 ? day.count : ""}
          </span>
          <div className="flex h-[52px] w-full items-end">
            {/* min-h keeps a quiet day visible as a stub rather than rounding
                away to nothing, so an all-zero week still reads as a chart. */}
            <div
              className="min-h-[3px] w-full rounded-[3px] transition-[height] duration-[160ms]"
              style={{
                height: `${day.barHeight}%`,
                backgroundColor: day.isBest ? color : "var(--track)",
              }}
            />
          </div>
          <span
            className="text-[10.5px] font-semibold"
            style={{
              color: day.isBest ? "var(--foreground)" : "var(--faint)",
            }}
          >
            {day.label}
          </span>
        </div>
      ))}
    </div>
  );
}
