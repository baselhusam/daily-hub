"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import type { DashboardData } from "@/lib/dashboard";
import { formatEstimate } from "@/lib/streak-utils";
import { getDueMeta } from "@/lib/due-meta";
import {
  formatTodayLabel,
  getGreeting,
  type CalendarMode,
} from "@/lib/dates";
import { useDisplayDay } from "@/lib/hydration";
import { PageHeader } from "@/components/ui/page-header";
import { QuickAdd } from "@/components/ui/quick-add";
import { SnapshotCard } from "@/components/ui/snapshot-card";
import { SurfaceCard } from "@/components/ui/surface-card";
import { EntityAvatar, InboxAvatar } from "@/components/ui/entity-avatar";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TaskRow } from "@/components/ui/task-row";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/brand-mark";
import { DailyChecklist } from "./daily-checklist";
import { CreateTaskDialog } from "./create-task-dialog";
import { ActivityAnalysisDialog, ActivityTrendCard } from "./activity-trend";
import { MomentumAnalysisDialog, MomentumCard } from "./momentum-card";
import {
  ProjectCard,
  groupLoggedTasks,
  taskMetaLabel,
  type EditableTask,
} from "./project-card";
import { toggleTask } from "@/app/actions/tasks";
import { useOptimisticFlags } from "@/lib/optimistic-toggle";
import { useCollapsedProjects } from "@/lib/use-collapsed-projects";
import { cn, isTypingTarget, sortInboxLog } from "@/lib/utils";

type DashboardShellProps = {
  data: DashboardData;
};

export function DashboardShell({ data }: DashboardShellProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectFilter = searchParams.get("project");
  const [editingTask, setEditingTask] = React.useState<EditableTask | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [analysisOpen, setAnalysisOpen] = React.useState(false);
  const [momentumOpen, setMomentumOpen] = React.useState(false);
  const taskFlags = React.useMemo(
    () => [
      ...data.projects.flatMap((project) =>
        project.tasks.map((task) => ({ id: task.id, value: task.done }))
      ),
      ...data.inboxTasks.map((task) => ({
        id: task.id,
        value: task.done,
      })),
    ],
    [data.projects, data.inboxTasks]
  );
  const optimisticTasks = useOptimisticFlags(taskFlags);
  const { today, mode, hydrated } = useDisplayDay(data.todayISO);
  const todayLabel = hydrated
    ? formatTodayLabel(today)
    : data.todayLabel;
  const greeting = hydrated
    ? getGreeting(data.settings.displayName)
    : data.greeting;

  React.useEffect(() => {
    const id = window.location.hash.replace("#", "");
    if (!id) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [projectFilter]);

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || !projectFilter) return;
      if (isTypingTarget(event.target)) return;
      if (
        document.querySelector(
          "[data-slot='dialog-content'], [data-slot='popover-content']"
        )
      ) {
        return;
      }
      event.preventDefault();
      router.push("/");
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [projectFilter, router]);

  const filteredProjects =
    projectFilter && projectFilter !== "all" && projectFilter !== "inbox"
      ? data.projects.filter((p) => p.id === projectFilter)
      : data.projects;

  const showInbox =
    !projectFilter || projectFilter === "all" || projectFilter === "inbox";
  const showHabits = !projectFilter || projectFilter === "all";
  const inboxOnly = projectFilter === "inbox";
  const filterProject = data.projects.find((p) => p.id === projectFilter);
  const collapseInputs = filteredProjects.map((project) => {
    const openCount = project.tasks.filter(
      (task) => !optimisticTasks.get(task.id, task.done)
    ).length;
    const isFilteredOpen = filterProject?.id === project.id;
    return {
      id: project.id,
      // A project the user has navigated into (via ?project=) is being read
      // in full, not glanced at — never fold it away underneath them.
      autoCollapsed:
        !isFilteredOpen &&
        (project.status === "DONE" ||
          (project.tasks.length > 1 && openCount === 0)),
    };
  });
  const {
    isCollapsed: isProjectCollapsed,
    toggle: toggleProjectCollapsed,
    setAll: setAllProjectsCollapsed,
  } = useCollapsedProjects(collapseInputs);
  const isFreshWorkspace =
    !filterProject &&
    data.projects.length === 0 &&
    data.inboxTasks.every((task) => task.done);
  const todayInboxTasks = data.inboxTasks.filter((task) => {
    const done = optimisticTasks.get(task.id, task.done);
    return !done || task.doneToday || !task.done;
  });
  const showTodayRail =
    !inboxOnly && (showHabits || (showInbox && todayInboxTasks.length > 0));
  const openInboxCount = data.inboxTasks.filter(
    (task) => !optimisticTasks.get(task.id, task.done)
  ).length;
  const loggedInboxCount = data.inboxTasks.length - openInboxCount;
  const todayOpenInboxCount = todayInboxTasks.filter(
    (task) => !optimisticTasks.get(task.id, task.done)
  ).length;
  const todayLoggedInboxCount = todayInboxTasks.length - todayOpenInboxCount;
  const olderLoggedInboxCount = data.inboxTasks.filter(
    (task) => task.done && !task.doneToday
  ).length;

  const optimisticOpenTasks =
    data.stats.openTasks +
    taskFlags.reduce((delta, task) => {
      const shown = optimisticTasks.get(task.id, task.value);
      if (shown === task.value) return delta;
      return delta + (shown ? -1 : 1);
    }, 0);
  const habitProgress =
    data.stats.dailyScheduled === 0
      ? 0
      : Math.round(
          (data.stats.dailyCompleted / data.stats.dailyScheduled) * 100
        );

  async function handleToggle(taskId: string, currentlyDone: boolean) {
    setActionError(null);
    try {
      const result = await optimisticTasks.run(taskId, currentlyDone, () =>
        toggleTask(taskId)
      );
      if (!result.success) {
        setActionError(
          result.error ?? "Could not update this task. Try again."
        );
      }
    } catch {
      setActionError("Could not update this task. Try again.");
    }
  }

  return (
    <div className="page-gutter animate-dh-fade py-[clamp(16px,2vw,26px)]">
      {editingTask && (
        <CreateTaskDialog
          projects={data.projects}
          task={{
            id: editingTask.id,
            title: editingTask.title,
            notes: editingTask.notes,
            projectId: editingTask.projectId,
            dueDate: editingTask.dueDate,
            estimatedMinutes: editingTask.estimatedMinutes,
          }}
          open
          onOpenChange={(next) => {
            if (!next) setEditingTask(null);
          }}
        />
      )}
      <ActivityAnalysisDialog
        activity={data.activity}
        open={analysisOpen}
        onOpenChange={setAnalysisOpen}
      />
      <MomentumAnalysisDialog
        momentum={data.momentum}
        open={momentumOpen}
        onOpenChange={setMomentumOpen}
      />
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
        <PageHeader
          eyebrow={todayLabel}
          title={greeting}
          description={
            inboxOnly
              ? inboxSummary(openInboxCount, loggedInboxCount)
              : data.stats.overdueTasks > 0
              ? `${data.stats.overdueTasks} overdue · ${optimisticOpenTasks} still open today.`
              : `${optimisticOpenTasks} open · ${data.stats.dailyCompleted}/${data.stats.dailyScheduled} habits done.`
          }
          actions={
            filterProject ? undefined : (
              <CreateTaskDialog
                projects={data.projects}
              />
            )
          }
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

        {(filterProject || inboxOnly) && (
          <div className="flex min-w-0 items-center gap-2 rounded-full border border-border bg-card py-1.5 pr-2 pl-2">
            {filterProject ? (
              <EntityAvatar
                name={filterProject.name}
                color={filterProject.color}
                logoUrl={filterProject.logoUrl}
                iconKey={filterProject.iconKey}
                size={22}
              />
            ) : (
              <InboxAvatar size={22} />
            )}
            <span className="min-w-0 truncate text-[13px] font-semibold">
              Filtered · {filterProject?.name ?? "Inbox"}
            </span>
            <Link
              href="/"
              className="grid h-[22px] w-[22px] place-items-center rounded-full bg-track text-[13px] text-muted-foreground hover:bg-hover"
              aria-label="Clear filter"
            >
              <X className="h-3 w-3" />
            </Link>
          </div>
        )}

        {(showHabits || inboxOnly) && (
          <QuickAdd
            projects={data.projects.map((p) => ({
              id: p.id,
              name: p.name,
              iconKey: p.iconKey,
              logoUrl: p.logoUrl,
              color: p.color,
            }))}
            defaultProjectId={inboxOnly ? undefined : filterProject?.id}
          />
        )}

        {showHabits && (
          <section
            aria-label="Daily pulse"
            className="grid grid-cols-2 gap-2.5 lg:grid-cols-[minmax(156px,0.75fr)_minmax(220px,1.1fr)_minmax(300px,1.5fr)]"
          >
            {data.snapshots
              .filter((snapshot) => snapshot.label === "Open tasks")
              .map((snapshot) => (
                <SnapshotCard
                  key={snapshot.label}
                  {...snapshot}
                  value={String(optimisticOpenTasks)}
                  onExpand={() => setAnalysisOpen(true)}
                  // Full width until the three-column layout kicks in, so the
                  // stacked mobile view has no half-empty row beside it.
                  className="col-span-2 lg:col-span-1"
                />
              ))}
            <MomentumCard momentum={data.momentum} onExpand={() => setMomentumOpen(true)} />
            <ActivityTrendCard
              activity={data.activity}
              onExpand={() => setAnalysisOpen(true)}
            />
          </section>
        )}

        {inboxOnly ? (
          <InboxPanel
            tasks={data.inboxTasks}
            openCount={openInboxCount}
            loggedCount={loggedInboxCount}
            getDone={(id, fallback) => optimisticTasks.get(id, fallback)}
            onToggle={handleToggle}
            onEdit={setEditingTask}
            today={today}
            mode={mode}
            expanded
          />
        ) : (
        <div
          className={cn(
            "grid gap-4",
            showTodayRail
              ? "dh:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.9fr)] dh:items-stretch"
              : "dh:grid-cols-1"
          )}
        >
          <div
            className={cn(
              "min-w-0",
              isFreshWorkspace
                ? "contents"
                : "order-2 flex flex-col gap-3 dh:order-1"
            )}
            aria-label="Open work"
          >
            {isFreshWorkspace ? (
              <SurfaceCard
                variant="quiet"
                className="order-2 flex min-h-0 flex-col justify-center dh:order-1"
              >
                <EmptyState
                  title="No open work"
                  description="Add a task, or create a project to group related work."
                >
                  <CreateTaskDialog projects={data.projects} />
                </EmptyState>
              </SurfaceCard>
            ) : (
              <>
                {filteredProjects.length > 1 ? (
                  <div className="flex items-center justify-end gap-1 px-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAllProjectsCollapsed(true)}
                      className="h-7 px-2 text-[12px] text-faint hover:text-foreground"
                    >
                      Collapse all
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAllProjectsCollapsed(false)}
                      className="h-7 px-2 text-[12px] text-faint hover:text-foreground"
                    >
                      Expand all
                    </Button>
                  </div>
                ) : null}
                {filteredProjects.map((project, projectIndex) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    index={projectIndex}
                    today={today}
                    mode={mode}
                    showAllLogs={filterProject?.id === project.id}
                    projects={data.projects}
                    collapsed={isProjectCollapsed(project.id)}
                    onToggleCollapsed={() => toggleProjectCollapsed(project.id)}
                    onToggleTask={(taskId, currentlyDone) => {
                      void handleToggle(taskId, currentlyDone);
                    }}
                    onEditTask={setEditingTask}
                    getDone={(id, fallback) => optimisticTasks.get(id, fallback)}
                  />
                ))}
              </>
            )}
          </div>

          {showTodayRail ? (
            <div
              className={cn(
                "min-w-0",
                isFreshWorkspace && todayInboxTasks.length === 0
                  ? "contents"
                  : "order-1 dh:order-2"
              )}
            >
              <div
                className={cn(
                  isFreshWorkspace && todayInboxTasks.length === 0
                    ? "contents"
                    : "flex h-full flex-col gap-3 dh:sticky dh:top-4 dh:max-h-[calc(100svh-4.75rem)] dh:overflow-y-auto dh:overscroll-contain dh:pr-0.5"
                )}
              >
                {showHabits && (
                  <SurfaceCard
                    variant="quiet"
                    className={cn(
                      "flex min-h-0 shrink-0 flex-col",
                      isFreshWorkspace && "order-1 dh:order-2"
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-3 px-4 pt-3 pb-2">
                      <h2 className="text-[13px] font-semibold tracking-[-0.015em]">
                        Today&apos;s habits
                      </h2>
                      <span className="text-[12px] text-faint tabular-nums">
                        {data.stats.dailyCompleted}/
                        {data.stats.dailyScheduled}
                      </span>
                    </div>
                    <ProgressBar
                      value={habitProgress}
                      className="h-px max-w-none rounded-none bg-rule-soft"
                    />
                    <div className="flex flex-1 flex-col justify-center py-1">
                      <DailyChecklist tasks={data.dailyTasks} />
                    </div>
                  </SurfaceCard>
                )}

                {showInbox && todayInboxTasks.length > 0 && (
                  <InboxPanel
                    tasks={todayInboxTasks}
                    openCount={todayOpenInboxCount}
                    loggedCount={todayLoggedInboxCount}
                    olderLoggedCount={olderLoggedInboxCount}
                    getDone={(id, fallback) =>
                      optimisticTasks.get(id, fallback)
                    }
                    onToggle={handleToggle}
                    onEdit={setEditingTask}
                    today={today}
                    mode={mode}
                    className="shrink-0"
                  />
                )}
              </div>
            </div>
          ) : null}
        </div>
        )}

        {showHabits && (
          <section className="flex flex-wrap items-center gap-6 rounded-[12px] border border-foreground bg-foreground p-5 text-background shadow-float">
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-semibold tracking-[0.02em] text-background/45">
                Week in review
              </p>
              <p className="mt-2 text-[26px] leading-snug text-pretty">
                {data.weekReview.line}
              </p>
            </div>
            <div className="flex flex-wrap gap-6">
              {data.weekReview.stats.map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl font-semibold tabular-nums leading-none">
                    {stat.value}
                  </div>
                  <div className="mt-1.5 text-[11.5px] text-background/45">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAnalysisOpen(true)}
                className="border-background/20 bg-transparent text-background hover:bg-background/10 hover:text-background"
              >
                Expand analysis
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-background/20 bg-transparent text-background hover:bg-background/10 hover:text-background"
              >
                <Link href="/analytics">Full analytics →</Link>
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function inboxSummary(openCount: number, loggedCount: number) {
  if (openCount === 0 && loggedCount === 0) return "Inbox is clear.";
  if (openCount === 0) {
    return `${loggedCount} finished.`;
  }
  if (loggedCount === 0) {
    return `${openCount} in inbox.`;
  }
  return `${openCount} open · ${loggedCount} finished.`;
}

function inboxNote(notes: string | null) {
  if (!notes) return undefined;
  const line = notes.trim().split("\n")[0]?.trim();
  if (!line) return undefined;
  return line.length > 88 ? `${line.slice(0, 87)}…` : line;
}

function InboxPanel({
  tasks,
  openCount,
  loggedCount,
  olderLoggedCount = 0,
  getDone,
  onToggle,
  onEdit,
  today,
  mode,
  expanded = false,
  className,
}: {
  tasks: DashboardData["inboxTasks"];
  openCount: number;
  loggedCount: number;
  olderLoggedCount?: number;
  getDone: (id: string, fallback: boolean) => boolean;
  onToggle: (id: string, done: boolean) => void;
  onEdit: (task: EditableTask) => void;
  today: Date;
  mode: CalendarMode;
  expanded?: boolean;
  className?: string;
}) {
  const visible = sortInboxLog(
    tasks.map((task) => ({
      ...task,
      done: getDone(task.id, task.done),
      completedAt: getDone(task.id, task.done)
        ? (task.completedAt ?? today)
        : null,
    }))
  );
  const openTasks = visible.filter((task) => !task.done);
  const loggedTasks = visible.filter((task) => task.done);
  const loggedGroups = expanded
    ? groupLoggedTasks(loggedTasks, today, mode)
    : loggedTasks.length > 0
      ? [{ key: "today", label: "Today", tasks: loggedTasks }]
      : [];

  function renderTask(task: DashboardData["inboxTasks"][number], done: boolean) {
    const due = done ? null : getDueMeta(task.dueDate, today, mode);
    return (
      <TaskRow
        key={task.id}
        task={{
          id: task.id,
          title: task.title,
          done,
          dueLabel: due?.label,
          dueColor: due?.color,
          estimateLabel: formatEstimate(task.estimatedMinutes),
          metaLabel: taskMetaLabel(task, done, today, mode),
          note: expanded ? inboxNote(task.notes) : undefined,
        }}
        onToggle={() => onToggle(task.id, done)}
        onEdit={() => onEdit(task)}
      />
    );
  }

  return (
    <SurfaceCard variant="quiet" className={className}>
      <div className="flex items-baseline justify-between gap-3 px-4 pt-3 pb-2">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold tracking-[-0.015em]">
            Inbox
          </h2>
          <p className="mt-0.5 text-[12px] text-faint">
            {expanded ? "Unfiled, from the start" : "Today"}
          </p>
        </div>
        {tasks.length > 0 ? (
          <span className="text-[12px] text-faint tabular-nums">
            {expanded
              ? openCount > 0 && loggedCount > 0
                ? `${openCount} open · ${loggedCount} finished`
                : openCount > 0
                  ? openCount
                  : `${loggedCount} finished`
              : openCount > 0
                ? openCount
                : null}
          </span>
        ) : null}
      </div>
      {tasks.length === 0 ? (
        <p className="px-4 pt-1 pb-4 text-[13px] text-faint">Inbox clear.</p>
      ) : (
        <div className="pb-1.5">
          {openTasks.map((task) => renderTask(task, false))}
          {loggedTasks.length > 0 ? (
            <div className={openTasks.length > 0 ? "mt-1" : undefined}>
              {loggedGroups.map((group) => (
                <div key={group.key}>
                  {expanded ? (
                    <div className="px-4 pt-2.5 pb-1 text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
                      {group.label}
                    </div>
                  ) : null}
                  {group.tasks.map((task) => renderTask(task, true))}
                </div>
              ))}
            </div>
          ) : null}
          {!expanded && olderLoggedCount > 0 ? (
            <Link
              href="/?project=inbox"
              className="block px-4 py-2 text-[12.5px] text-faint transition-colors duration-[120ms] hover:text-signal"
            >
              {olderLoggedCount} finished →
            </Link>
          ) : null}
        </div>
      )}
    </SurfaceCard>
  );
}
