"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { createMilestone, deleteMilestone, toggleMilestone } from "@/app/actions/milestones";
import { toggleTask } from "@/app/actions/tasks";
import { TaskComposer, type ComposerTask } from "@/components/dashboard/task-composer";
import { TodayTaskRow } from "@/components/dashboard/today-task-row";
import { duePillFor, firstNoteLine, sortOpenForToday, taskMeta } from "@/components/dashboard/project-group";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatCompletedAgo, formatDueDate, isOverdue } from "@/lib/dates";
import { useDisplayDay } from "@/lib/hydration";
import { useOptimisticFlags } from "@/lib/optimistic-toggle";
import type { ProjectDetailData } from "@/lib/project-detail";
import { getProjectStatus } from "@/lib/status";
import { daysUntil, formatEstimate } from "@/lib/streak-utils";
import { formatFocusHours } from "@/lib/today-insights";
import { cn, sortInboxLog } from "@/lib/utils";
import { useWeekStart, weekdayOrder } from "@/lib/week-start";
import { ProjectFormDialog } from "./project-form-dialog";

const RANGES = [14, 30, 90] as const;
type Range = (typeof RANGES)[number];
const DONE_PREVIEW = 3;
const CHART_HEIGHT = 150;
const STATUS_PILL: Record<string, string> = {
  signal: "bg-signal-soft text-signal",
  warn: "bg-warn-wash text-warn",
  done: "bg-done-wash text-done",
  muted: "bg-paper text-muted-foreground",
};
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_FULL = [
  "Sundays",
  "Mondays",
  "Tuesdays",
  "Wednesdays",
  "Thursdays",
  "Fridays",
  "Saturdays",
];

function lastTouchedLabel(idleDays: number): string {
  if (idleDays >= 99) return "Never touched";
  if (idleDays === 0) return "Last touched today";
  if (idleDays === 1) return "Last touched yesterday";
  return `Last touched ${idleDays}d ago`;
}

function niceGrid(top: number): number[] {
  const step = top <= 4 ? 1 : top <= 8 ? 2 : top <= 20 ? 5 : Math.ceil(top / 4 / 5) * 5;
  const values: number[] = [];
  for (let value = 0; value <= top; value += step) values.push(value);
  return values;
}

export function ProjectDetailShell({ data }: { data: ProjectDetailData }) {
  const router = useRouter();
  const { today, mode } = useDisplayDay(data.todayISO);
  const weekStartsOn = useWeekStart();
  const { project, stats } = data;
  const status = getProjectStatus(project.status);

  const [range, setRange] = React.useState<Range>(30);
  const [showAllDone, setShowAllDone] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [quickOpen, setQuickOpen] = React.useState(false);
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null);
  const [milestoneDraft, setMilestoneDraft] = React.useState<{ name: string; due: string } | null>(null);
  const [milestonePending, setMilestonePending] = React.useState(false);
  const [weekMode, setWeekMode] = React.useState<"avg" | "total">("avg");
  const [weekHover, setWeekHover] = React.useState<number | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const taskFlags = useOptimisticFlags(
    React.useMemo(() => data.tasks.map((task) => ({ id: task.id, value: task.done })), [data.tasks])
  );
  const milestoneFlags = useOptimisticFlags(
    React.useMemo(
      () => data.milestones.map((milestone) => ({ id: milestone.id, value: milestone.done })),
      [data.milestones]
    )
  );

  const tasks = sortInboxLog(
    data.tasks.map((task) => {
      const done = taskFlags.get(task.id, task.done);
      return { ...task, done, completedAt: done ? (task.completedAt ?? today) : null };
    })
  );
  const openTasks = sortOpenForToday(tasks.filter((task) => !task.done), today, mode);
  const doneTasks = tasks.filter((task) => task.done);
  const visibleDone = showAllDone ? doneTasks : doneTasks.slice(0, DONE_PREVIEW);
  const hiddenDone = doneTasks.length - visibleDone.length;
  const openCount = openTasks.length;
  const doneCount = doneTasks.length;
  const total = openCount + doneCount;
  const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);
  const milestonesDone = data.milestones.filter((m) => milestoneFlags.get(m.id, m.done)).length;

  const points = data.activity.slice(-range);
  const chartTop = Math.max(1, ...points.map((point) => point.count));
  const gridTop = Math.max(2, Math.ceil(chartTop / 2) * 2);
  const grid = niceGrid(gridTop);
  const rangeTotal = points.reduce((sum, point) => sum + point.count, 0);
  const activeDays = points.filter((point) => point.count > 0).length;
  const tickEvery = Math.max(1, Math.ceil(points.length / 5));

  const weekdays = weekdayOrder(weekStartsOn).map((index) => {
    const day = data.weekdays[index];
    return {
      index,
      label: WEEKDAY_SHORT[index],
      full: WEEKDAY_FULL[index],
      shown: weekMode === "total" ? day.total : day.average,
      average: day.average,
    };
  });
  const weekMax = Math.max(0.0001, ...weekdays.map((day) => day.shown));
  const weekSum = weekdays.reduce((sum, day) => sum + day.average, 0);
  const bestShown = Math.max(...weekdays.map((day) => day.shown));
  const bestDays = weekdays.filter((day) => day.shown === bestShown && day.shown > 0);
  const hovered = weekHover === null ? null : weekdays.find((day) => day.index === weekHover) ?? null;
  const weekNote = hovered
    ? `${hovered.full}: ${
        weekMode === "total"
          ? `${hovered.shown} finished in 90 days`
          : `${hovered.shown.toFixed(2)} a day on average`
      } · ${Math.round((hovered.average / (weekSum || 1)) * 100)}% of the project's week`
    : weekSum === 0
      ? "Nothing finished in the last 90 days yet."
      : `About ${(weekSum).toFixed(1)} finished a week over the last 90 days — ${
          bestDays.length > 1 ? "spread fairly evenly across the week." : `${bestDays[0]?.full ?? ""} carry it.`
        }`;

  const shipDays = daysUntil(project.dueDate, today, mode);
  const shipLine =
    project.status === "DONE"
      ? { label: "Done", tone: "text-done" }
      : shipDays === null
        ? { label: "No ship date", tone: "text-faint" }
        : shipDays < 0
          ? { label: `Ships ${formatDueDate(project.dueDate, today, mode)} · ${Math.abs(shipDays)}d late`, tone: "text-destructive" }
          : shipDays === 0
            ? { label: "Ships today", tone: "text-warn" }
            : {
                label: `Ships ${formatDueDate(project.dueDate, today, mode).replace(/^\w{3}, /, "")} · ${shipDays}d left`,
                tone: shipDays <= 14 ? "text-warn" : "text-faint",
              };

  const tiles = [
    {
      label: "Open",
      value: String(openCount),
      delta: stats.openDelta === 0 ? "" : `${stats.openDelta < 0 ? "−" : "+"}${Math.abs(stats.openDelta)}`,
      deltaTone: stats.openDelta < 0 ? "text-done" : "text-warn",
      hint: stats.overdueCount > 0 ? `${stats.overdueCount} overdue` : "nothing overdue",
    },
    {
      label: "Finished",
      value: String(doneCount),
      delta: stats.finishedThisWeek > 0 ? `+${stats.finishedThisWeek}` : "",
      deltaTone: "text-done",
      hint: total > 0 ? `${pct}% of ${total}` : "no tasks yet",
    },
    {
      label: "Milestones",
      value: data.milestones.length > 0 ? `${milestonesDone}/${data.milestones.length}` : "—",
      delta: "",
      deltaTone: "",
      hint:
        stats.nextMilestoneDays === null
          ? data.milestones.length === 0
            ? "none set"
            : "all reached"
          : stats.nextMilestoneDays < 0
            ? `${Math.abs(stats.nextMilestoneDays)}d late`
            : stats.nextMilestoneDays === 0
              ? "next is today"
              : `next in ${stats.nextMilestoneDays}d`,
    },
    {
      label: "Focus logged",
      value: formatFocusHours(stats.focusMinutes),
      delta: stats.focusThisWeekMinutes > 0 ? `+${formatFocusHours(stats.focusThisWeekMinutes)}` : "",
      deltaTone: "text-done",
      hint: lastTouchedLabel(stats.idleDays).toLowerCase(),
    },
  ];

  async function runToggleTask(id: string, currentlyDone: boolean) {
    setActionError(null);
    try {
      const result = await taskFlags.run(id, currentlyDone, () => toggleTask(id));
      if (!result.success) setActionError(result.error ?? "Could not update this task.");
    } catch {
      setActionError("Could not update this task. Try again.");
    }
  }

  async function runToggleMilestone(id: string, currentlyDone: boolean) {
    setActionError(null);
    try {
      const result = await milestoneFlags.run(id, currentlyDone, () => toggleMilestone(id));
      if (!result.success) setActionError(result.error ?? "Could not update this milestone.");
    } catch {
      setActionError("Could not update this milestone. Try again.");
    }
  }

  async function submitMilestone() {
    if (!milestoneDraft || !milestoneDraft.name.trim() || milestonePending) return;
    setMilestonePending(true);
    setActionError(null);
    const formData = new FormData();
    formData.set("projectId", project.id);
    formData.set("name", milestoneDraft.name.trim());
    formData.set("dueDate", milestoneDraft.due);
    try {
      const result = await createMilestone(formData);
      if (!result.success) {
        setActionError(result.error ?? "Could not add this milestone.");
        return;
      }
      setMilestoneDraft(null);
    } catch {
      setActionError("Could not add this milestone. Try again.");
    } finally {
      setMilestonePending(false);
    }
  }

  async function removeMilestone(id: string) {
    setActionError(null);
    try {
      const result = await deleteMilestone(id);
      if (!result.success) setActionError(result.error ?? "Could not delete this milestone.");
    } catch {
      setActionError("Could not delete this milestone. Try again.");
    }
  }

  const formValues = {
    id: project.id,
    name: project.name,
    description: project.description,
    iconKey: project.iconKey,
    logoUrl: project.logoUrl,
    color: project.rawColor,
    colorSource: project.colorSource,
    dueDate: project.dueDate,
    status: project.status,
    milestones: data.milestones,
  };

  function renderTask(task: (typeof tasks)[number]) {
    if (editingTaskId === task.id) {
      const editable: ComposerTask = {
        id: task.id,
        title: task.title,
        notes: task.notes,
        projectId: task.projectId,
        dueDate: task.dueDate,
        estimatedMinutes: task.estimatedMinutes,
      };
      return (
        <div key={task.id} className="mx-3.5 my-1">
          <TaskComposer
            today={today}
            projectId={project.id}
            task={editable}
            projects={data.projectOptions}
            onClose={() => setEditingTaskId(null)}
            onError={setActionError}
          />
        </div>
      );
    }
    return (
      <TodayTaskRow
        key={task.id}
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
        onToggle={() => void runToggleTask(task.id, task.done)}
        onEdit={() => {
          setComposerOpen(false);
          setEditingTaskId(task.id);
        }}
        className="px-[18px]"
      />
    );
  }

  return (
    <div className="page-gutter animate-dh-fade pt-[clamp(16px,2vw,22px)] pb-12">
      <ProjectFormDialog
        project={formValues}
        open={editing}
        onOpenChange={setEditing}
        onDeleted={() => router.push("/projects")}
      />

      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-4">
        <section className="rounded-[14px] border border-border bg-card p-5 shadow-raised">
          <div className="flex flex-wrap items-start gap-4">
            <EntityAvatar
              name={project.name}
              color={project.color}
              logoUrl={project.logoUrl}
              iconKey={project.iconKey}
              size={52}
              rounded="lg"
              className="shrink-0"
            />
            <div className="min-w-0 flex-1 basis-[16rem]">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[clamp(1.5rem,3vw,1.75rem)] leading-[1.1] tracking-[-0.035em]">
                  {project.name}
                </h1>
                <span className={cn("rounded-[6px] px-2 py-0.5 text-[11px] font-bold tracking-[0.02em]", STATUS_PILL[status.tone])}>
                  {status.label}
                </span>
              </div>
              {project.description ? (
                <p className="mt-2 max-w-[62ch] text-[13.5px] leading-[1.6] text-muted-foreground">
                  {project.description}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-x-[18px] gap-y-1 text-[12px] text-faint">
                <span className={cn("font-semibold tabular-nums", shipLine.tone)}>{shipLine.label}</span>
                <span className="tabular-nums">Running {stats.ageDays}d</span>
                <span>{lastTouchedLabel(stats.idleDays)}</span>
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex h-8 items-center gap-[7px] rounded-[8px] border border-border bg-card px-3 text-[12.5px] font-medium shadow-raised transition-colors hover:border-border-strong"
              >
                <Pencil className="h-[13px] w-[13px]" strokeWidth={1.7} />
                Edit
              </button>
              <Popover open={quickOpen} onOpenChange={setQuickOpen} modal={false}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-signal px-3 text-[12.5px] font-semibold text-primary-foreground transition-colors hover:bg-signal-hover"
                  >
                    <Plus className="h-[13px] w-[13px]" strokeWidth={2.4} />
                    Add task
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" sideOffset={8} className="w-[min(340px,calc(100vw-1.5rem))] p-0">
                  <div className="flex items-center justify-between px-3.5 pt-3 pb-1">
                    <span className="truncate text-[10px] font-bold tracking-[0.075em] text-faint uppercase">
                      Quick add · {project.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuickOpen(false)}
                      aria-label="Close"
                      className="grid h-5 w-5 place-items-center rounded-[5px] text-faint hover:bg-hover hover:text-foreground"
                    >
                      <X className="h-3 w-3" strokeWidth={1.9} />
                    </button>
                  </div>
                  <TaskComposer
                    today={today}
                    projectId={project.id}
                    onClose={() => setQuickOpen(false)}
                    onError={setActionError}
                    className="border-0 bg-transparent"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="mt-[18px]">
            <div className="mb-[7px] flex items-baseline justify-between">
              <span className="text-[12px] text-muted-foreground">
                <b className="text-[13px] font-semibold text-foreground tabular-nums">{openCount}</b> open ·{" "}
                {doneCount} done
              </span>
              <span className="text-[12px] font-semibold text-muted-foreground tabular-nums">{pct}%</span>
            </div>
            <span className="block h-[5px] overflow-hidden rounded-full bg-track">
              <span
                className="block h-full rounded-full transition-[width] duration-300"
                style={{ width: `${pct}%`, backgroundColor: project.color }}
              />
            </span>
          </div>
        </section>

        {actionError ? (
          <p role="alert" aria-live="polite" className="rounded-[10px] border border-destructive/25 bg-destructive-wash px-3.5 py-2.5 text-[13px] text-destructive">
            {actionError}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map((tile) => (
            <div key={tile.label} className="rounded-[11px] border border-border bg-canvas-sunk px-[15px] py-[13px]">
              <div className="text-[10.5px] font-bold tracking-[0.08em] text-faint uppercase">{tile.label}</div>
              <div className="mt-2 flex items-baseline gap-[7px]">
                <span className="text-[22px] leading-none font-semibold tracking-[-0.025em] tabular-nums">{tile.value}</span>
                {tile.delta ? <span className={cn("text-[11px] font-bold", tile.deltaTone)}>{tile.delta}</span> : null}
              </div>
              <div className="mt-1.5 text-[11.5px] text-faint">{tile.hint}</div>
            </div>
          ))}
        </div>

        <section className="rounded-[12px] border border-border bg-card shadow-raised">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule-soft px-[18px] py-[15px]">
            <div>
              <h2 className="text-[15px] tracking-[-0.01em]">Completion rhythm</h2>
              <p className="mt-1 text-[12px] text-faint">Tasks this project closed, day by day.</p>
            </div>
            <span className="inline-flex gap-0.5 rounded-[9px] border border-border bg-canvas-sunk p-[3px]" role="group" aria-label="Range">
              {RANGES.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={range === value}
                  onClick={() => setRange(value)}
                  className={cn(
                    "inline-flex h-[26px] items-center rounded-[6px] px-[11px] text-[11.5px] font-semibold tabular-nums transition-colors",
                    range === value ? "bg-card text-foreground shadow-raised" : "text-faint hover:text-foreground"
                  )}
                >
                  {value}d
                </button>
              ))}
            </span>
          </div>
          <div className="flex gap-3.5 px-[18px] pt-[18px] pb-3">
            <div className="relative w-6 shrink-0 text-right text-[10.5px] text-hairline tabular-nums" style={{ height: CHART_HEIGHT }}>
              {grid.map((value) => (
                <span
                  key={value}
                  className="absolute right-0 -translate-y-1/2"
                  style={{ top: `${(1 - value / gridTop) * 100}%` }}
                >
                  {value}
                </span>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="relative flex items-end border-b border-border"
                style={{ height: CHART_HEIGHT, gap: range > 45 ? 2 : 4 }}
              >
                {grid.slice(1).map((value) => (
                  <span
                    key={value}
                    className="absolute inset-x-0 border-t border-dashed border-rule-soft"
                    style={{ top: `${(1 - value / gridTop) * 100}%` }}
                  />
                ))}
                {points.map((point, index) => (
                  <span
                    key={point.date}
                    title={`${point.fullLabel}: ${point.count} finished`}
                    className="relative min-h-[3px] flex-1 rounded-t-[3px] transition-colors duration-[120ms] hover:!bg-[var(--project-color)]"
                    style={
                      {
                        "--project-color": project.color,
                        height: `${(point.count / gridTop) * 100}%`,
                        backgroundColor:
                          index === points.length - 1
                            ? project.color
                            : point.count === 0
                              ? "var(--track)"
                              : `color-mix(in srgb, ${project.color} 38%, var(--card))`,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10.5px] text-faint tabular-nums">
                {points
                  .filter((_, index) => index % tickEvery === 0 || index === points.length - 1)
                  .map((point) => (
                    <span key={point.date}>{point.isToday ? "Today" : point.label}</span>
                  ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule-soft px-[18px] py-[11px] text-[11.5px] text-faint">
            <span className="inline-flex items-center gap-[7px]">
              <span className="h-[7px] w-[7px] rounded-[2px]" style={{ backgroundColor: project.color }} />
              {rangeTotal} finished · active on {activeDays} of {range} days
            </span>
            <span className="tabular-nums">Peak {Math.max(0, ...points.map((p) => p.count))} in one day</span>
          </div>
        </section>

        <div className="grid items-start gap-3.5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <section className="rounded-[12px] border border-border bg-card shadow-raised">
            <div className="flex items-center justify-between border-b border-rule-soft px-[18px] py-3.5">
              <h2 className="text-[15px] tracking-[-0.01em]">
                Tasks{" "}
                <span className="ml-1.5 text-[12px] font-normal text-faint tabular-nums">{openCount} open</span>
              </h2>
              <button
                type="button"
                onClick={() => {
                  setEditingTaskId(null);
                  setComposerOpen(true);
                }}
                className="inline-flex h-[30px] items-center gap-1.5 rounded-[7px] border border-border bg-card px-[11px] text-[12.5px] font-medium transition-colors hover:border-border-strong"
              >
                <Plus className="h-[13px] w-[13px]" strokeWidth={2.2} />
                Add task
              </button>
            </div>
            {composerOpen ? (
              <div className="mx-3.5 mt-[11px] mb-0.5">
                <TaskComposer
                  today={today}
                  projectId={project.id}
                  onClose={() => setComposerOpen(false)}
                  onError={setActionError}
                />
              </div>
            ) : null}
            <div className="pt-[5px] pb-2">
              {openTasks.length === 0 && !composerOpen ? (
                <p className="px-[18px] py-4 text-[13px] text-faint">
                  Nothing open. {doneCount > 0 ? "Everything here is finished." : "Add the first task."}
                </p>
              ) : null}
              {openTasks.map(renderTask)}
              {doneTasks.length > 0 ? (
                <>
                  <div className="px-[18px] pt-[9px] pb-1 text-[11px] font-bold tracking-[0.08em] text-faint uppercase">
                    Finished
                  </div>
                  {visibleDone.map((task) =>
                    editingTaskId === task.id ? (
                      renderTask(task)
                    ) : (
                      <div
                        key={task.id}
                        onClick={() => void runToggleTask(task.id, true)}
                        className="flex cursor-pointer items-center gap-[11px] px-[18px] py-[7px] transition-colors hover:bg-canvas-sunk"
                      >
                        <Checkbox
                          checked
                          onCheckedChange={() => void runToggleTask(task.id, true)}
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`Reopen ${task.title}`}
                        />
                        <span className="min-w-0 flex-1 truncate text-[14px] text-muted-foreground line-through decoration-hairline">
                          {task.title}
                        </span>
                        <span className="text-[11.5px] text-faint">
                          {formatCompletedAgo(task.completedAt ?? today, today, mode)?.replace(/^Done /, "")}
                        </span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditingTaskId(task.id);
                          }}
                          aria-label={`Edit ${task.title}`}
                          className="grid h-6 w-6 place-items-center rounded-[6px] text-hairline transition-colors hover:bg-hover hover:text-foreground"
                        >
                          <Pencil className="h-[13px] w-[13px]" />
                        </button>
                      </div>
                    )
                  )}
                  {hiddenDone > 0 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllDone(true)}
                      className="block w-full py-2 pr-[18px] pl-[47px] text-left text-[12.5px] text-faint transition-colors hover:text-signal"
                    >
                      {hiddenDone} more finished →
                    </button>
                  ) : showAllDone && doneTasks.length > DONE_PREVIEW ? (
                    <button
                      type="button"
                      onClick={() => setShowAllDone(false)}
                      className="block w-full py-2 pr-[18px] pl-[47px] text-left text-[12.5px] text-faint transition-colors hover:text-signal"
                    >
                      Show fewer
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          </section>

          <div className="flex flex-col gap-3.5">
            <section className="rounded-[12px] border border-border bg-card shadow-raised">
              <div className="flex items-center justify-between border-b border-rule-soft px-[18px] py-3.5">
                <h2 className="text-[15px] tracking-[-0.01em]">Milestones</h2>
                <span className="text-[12px] text-faint tabular-nums">
                  {data.milestones.length === 0 ? "none yet" : `${milestonesDone}/${data.milestones.length} reached`}
                </span>
              </div>
              <div className="flex flex-col gap-[11px] px-[18px] py-[15px]">
                {data.milestones.map((milestone) => {
                  const done = milestoneFlags.get(milestone.id, milestone.done);
                  const days = done ? null : daysUntil(milestone.dueDate, today, mode);
                  return (
                    <div key={milestone.id} id={`milestone-${milestone.id}`} className="group flex items-center gap-2.5">
                      <Checkbox
                        checked={done}
                        onCheckedChange={() => void runToggleMilestone(milestone.id, done)}
                        className="size-[17px]"
                        aria-label={`Toggle ${milestone.name}`}
                      />
                      <span className={cn("min-w-0 flex-1 truncate text-[13.5px] font-medium", done ? "text-muted-foreground" : "text-foreground")}>
                        {milestone.name}
                      </span>
                      {days !== null ? (
                        <span className={cn("text-[11px] tabular-nums", days < 0 ? "text-destructive" : "text-faint")}>
                          {days < 0 ? `${Math.abs(days)}d late` : days === 0 ? "today" : `${days}d`}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void removeMilestone(milestone.id)}
                        aria-label={`Delete ${milestone.name}`}
                        className="grid h-6 w-6 place-items-center rounded-[6px] text-hairline opacity-0 transition-[opacity,color,background-color] group-hover:opacity-100 hover:bg-destructive-wash hover:text-destructive focus-visible:opacity-100"
                      >
                        <Trash2 className="h-[13px] w-[13px]" strokeWidth={1.7} />
                      </button>
                    </div>
                  );
                })}
                {milestoneDraft ? (
                  <div className="flex flex-col gap-2 rounded-[10px] border border-border-strong/70 bg-canvas-sunk p-2.5">
                    <input
                      autoFocus
                      value={milestoneDraft.name}
                      onChange={(event) => setMilestoneDraft({ ...milestoneDraft, name: event.target.value })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void submitMilestone();
                        }
                        if (event.key === "Escape") setMilestoneDraft(null);
                      }}
                      placeholder="Milestone name"
                      maxLength={120}
                      className="h-7 bg-transparent text-[13.5px] font-medium text-foreground outline-none placeholder:text-faint"
                    />
                    <div className="flex items-center gap-2">
                      <DatePicker
                        value={milestoneDraft.due}
                        onValueChange={(due) => setMilestoneDraft({ ...milestoneDraft, due })}
                        placeholder="Due"
                        variant="plain"
                        className="h-[26px] rounded-full border border-border bg-card px-2.5 text-[11.5px]"
                      />
                      <span className="flex-1" />
                      <button
                        type="button"
                        onClick={() => setMilestoneDraft(null)}
                        className="h-7 rounded-[7px] px-2.5 text-[12px] text-faint hover:bg-hover hover:text-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void submitMilestone()}
                        disabled={!milestoneDraft.name.trim() || milestonePending}
                        className={cn(
                          "h-7 rounded-[7px] px-3 text-[12px] font-semibold",
                          milestoneDraft.name.trim() ? "bg-foreground text-background" : "bg-track text-faint"
                        )}
                      >
                        {milestonePending ? "Adding…" : "Add"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMilestoneDraft({ name: "", due: "" })}
                    className="inline-flex items-center gap-2 self-start text-[12.5px] text-faint transition-colors hover:text-foreground"
                  >
                    <span className="grid h-[17px] w-[17px] place-items-center rounded-[5px] border-[1.5px] border-dashed border-hairline">
                      <Plus className="h-2.5 w-2.5" strokeWidth={2.6} />
                    </span>
                    Add milestone
                  </button>
                )}
              </div>
            </section>

            <section className="rounded-[12px] border border-border bg-card shadow-raised">
              <div className="flex items-center justify-between gap-3 border-b border-rule-soft px-[18px] py-3">
                <h2 className="text-[15px] tracking-[-0.01em]">Weekly shape</h2>
                <span className="inline-flex gap-0.5 rounded-[8px] border border-border bg-canvas-sunk p-[3px]" role="group" aria-label="Weekly shape mode">
                  {(["avg", "total"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={weekMode === value}
                      onClick={() => setWeekMode(value)}
                      className={cn(
                        "inline-flex h-6 items-center rounded-[6px] px-2.5 text-[11px] font-semibold transition-colors",
                        weekMode === value ? "bg-card text-foreground shadow-raised" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {value === "avg" ? "Avg" : "Total"}
                    </button>
                  ))}
                </span>
              </div>
              <div className="px-[18px] py-[18px]">
                <div className="flex items-end gap-2">
                  {weekdays.map((day) => {
                    const hot = weekHover === day.index;
                    const best = day.shown === bestShown && day.shown > 0;
                    return (
                      <div
                        key={day.index}
                        onMouseEnter={() => setWeekHover(day.index)}
                        onMouseLeave={() => setWeekHover(null)}
                        className="flex flex-1 flex-col items-center gap-[7px]"
                      >
                        <span className={cn("text-[10.5px] tabular-nums", hot || best ? "font-bold text-foreground" : "text-muted-foreground")}>
                          {weekMode === "total" ? day.shown : day.shown.toFixed(2)}
                        </span>
                        <span
                          className={cn("flex h-16 w-full items-end rounded-[5px]", hot && "bg-paper shadow-[inset_0_0_0_1px_var(--border)]")}
                        >
                          <span
                            className="w-full min-h-[3px] rounded-t-[4px]"
                            style={{
                              height: `${Math.round((day.shown / weekMax) * 100)}%`,
                              backgroundColor:
                                hot || best
                                  ? project.color
                                  : day.shown === 0
                                    ? "var(--track)"
                                    : `color-mix(in srgb, ${project.color} 34%, var(--card))`,
                            }}
                          />
                        </span>
                        <span className={cn("text-[10.5px] font-semibold", hot || best ? "text-foreground" : "text-muted-foreground")}>
                          {day.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="border-t border-rule-soft px-[18px] py-[11px] text-[11.5px] text-muted-foreground text-pretty">
                {weekNote}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
