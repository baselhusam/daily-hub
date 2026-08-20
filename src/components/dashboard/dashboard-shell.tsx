"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import type { DashboardData } from "@/lib/dashboard";
import { StatusChip } from "@/components/ui/option-mark";
import { daysUntil, formatEstimate } from "@/lib/streak-utils";
import { getDueMeta, getDeadlineColor } from "@/lib/due-meta";
import { formatAddedAgo, formatTodayLabel, getGreeting, type CalendarMode } from "@/lib/dates";
import { useDisplayDay } from "@/lib/hydration";
import { PageHeader } from "@/components/ui/page-header";
import { QuickAdd } from "@/components/ui/quick-add";
import { NudgeChip } from "@/components/ui/nudge-chip";
import { SnapshotCard } from "@/components/ui/snapshot-card";
import { SurfaceCard } from "@/components/ui/surface-card";
import { EntityAvatar, InboxAvatar } from "@/components/ui/entity-avatar";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TaskRow } from "@/components/ui/task-row";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/brand-mark";
import { DailyChecklist } from "./daily-checklist";
import { CreateTaskDialog } from "./create-task-dialog";
import { toggleTask } from "@/app/actions/tasks";
import { useOptimisticFlags } from "@/lib/optimistic-toggle";
import { cn, isTypingTarget, sortCompletedLast } from "@/lib/utils";

type EditableTask = {
  id: string;
  title: string;
  notes: string | null;
  projectId: string | null;
  dueDate: Date | null;
  estimatedMinutes: number | null;
};

type DashboardShellProps = {
  data: DashboardData;
};

export function DashboardShell({ data }: DashboardShellProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectFilter = searchParams.get("project");
  const [editingTask, setEditingTask] = React.useState<EditableTask | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const taskFlags = React.useMemo(
    () => [
      ...data.projects.flatMap((project) =>
        project.tasks.map((task) => ({ id: task.id, value: task.doneToday }))
      ),
      ...data.inboxTasks.map((task) => ({
        id: task.id,
        value: task.doneToday,
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
  const isFreshWorkspace =
    !filterProject &&
    data.projects.length === 0 &&
    data.inboxTasks.length === 0;
  const showTodayRail =
    !inboxOnly && (showHabits || (showInbox && !isFreshWorkspace));
  const openInboxCount = data.inboxTasks.filter(
    (task) => !optimisticTasks.get(task.id, task.doneToday)
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
    <div className="page-gutter animate-dh-fade py-[clamp(18px,2.6vw,32px)]">
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
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5">
        <PageHeader
          eyebrow={todayLabel}
          title={greeting}
          description={
            inboxOnly
              ? openInboxCount === 0
                ? "Inbox is clear."
                : `${openInboxCount} in inbox.`
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

        {showHabits && data.nudges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.nudges.map((nudge, index) => (
              <NudgeChip
                key={index}
                variant={nudge.variant}
                leading={
                  nudge.projectName ? (
                    <EntityAvatar
                      name={nudge.projectName}
                      color={nudge.color}
                      logoUrl={nudge.logoUrl}
                      iconKey={nudge.iconKey}
                      size={18}
                    />
                  ) : undefined
                }
                action={
                  nudge.actionLabel && nudge.projectId ? (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/?project=${nudge.projectId}`)
                      }
                      className="text-[12.5px] font-semibold text-signal whitespace-nowrap hover:text-signal-hover"
                    >
                      {nudge.actionLabel} →
                    </button>
                  ) : undefined
                }
              >
                {nudge.text}
              </NudgeChip>
            ))}
          </div>
        )}

        {showHabits && (
          <section className="flex flex-col gap-2.5">
            <div className="section-kicker">Daily pulse</div>
            <div className="grid grid-cols-2 gap-3 dh:grid-cols-4">
              {data.snapshots.map((snapshot) =>
                snapshot.label === "Open tasks" ? (
                  <SnapshotCard
                    key={snapshot.label}
                    {...snapshot}
                    value={String(optimisticOpenTasks)}
                  />
                ) : (
                  <SnapshotCard key={snapshot.label} {...snapshot} />
                )
              )}
            </div>
          </section>
        )}

        {inboxOnly ? (
          <InboxPanel
            tasks={data.inboxTasks}
            openCount={openInboxCount}
            getDone={(id, fallback) => optimisticTasks.get(id, fallback)}
            onToggle={handleToggle}
            onEdit={setEditingTask}
            today={today}
            mode={mode}
          />
        ) : (
        <div
          className={cn(
            "grid gap-5",
            showTodayRail
              ? "dh:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.9fr)]"
              : "dh:grid-cols-1"
          )}
        >
          <div className="order-2 flex min-w-0 flex-col gap-3.5 dh:order-1">
            <div className="flex items-baseline justify-between gap-3 px-0.5">
              <h2 className="section-kicker flex-1">Open work</h2>
              <span className="text-[11.5px] tracking-[0.1em] text-faint tabular-nums">
                {optimisticOpenTasks} open
              </span>
            </div>

            {isFreshWorkspace ? (
              <SurfaceCard variant="quiet">
                <EmptyState
                  title="No open work"
                  description="Add a task, or create a project to group related work."
                >
                  <CreateTaskDialog projects={data.projects} />
                </EmptyState>
              </SurfaceCard>
            ) : (
              filteredProjects.map((project) => {
                const dl = daysUntil(project.dueDate, today, mode);
                const visibleTasks = sortCompletedLast(
                  project.tasks,
                  (task) => optimisticTasks.get(task.id, task.doneToday)
                );
                const openCount = project.tasks.filter(
                  (task) => !optimisticTasks.get(task.id, task.doneToday)
                ).length;
                const openMilestones = project.milestones
                  .filter((m) => !m.done)
                  .slice(0, 3);

                return (
                  <SurfaceCard key={project.id} variant="quiet">
                    <div className="flex items-start gap-2.5 px-4 pt-3.5 pb-2">
                      <EntityAvatar
                        name={project.name}
                        color={project.color}
                        logoUrl={project.logoUrl}
                        iconKey={project.iconKey}
                        size={22}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="min-w-0 truncate text-[14.5px] font-semibold tracking-[-0.015em]">
                            {project.name}
                          </span>
                          {project.status !== "ACTIVE" ? (
                            <StatusChip status={project.status} />
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-[12px] text-faint">
                          {openCount} open
                          {project.doneCount > 0
                            ? ` · ${project.doneCount} logged`
                            : null}
                        </p>
                      </div>
                      {dl !== null && (
                        <span
                          className="shrink-0 pt-0.5 text-[12.5px] font-medium tabular-nums"
                          style={{ color: getDeadlineColor(dl) }}
                        >
                          {dl < 0 ? `${Math.abs(dl)}d late` : `${dl}d`}
                        </span>
                      )}
                    </div>

                    {openMilestones.length > 0 && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 px-4 pb-1.5">
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
                                    md !== null && md <= 7
                                      ? "var(--signal)"
                                      : "var(--hairline)",
                                }}
                              />
                              {milestone.name}
                              {md !== null && (
                                <span className="text-faint tabular-nums">
                                  {md < 0
                                    ? `${Math.abs(md)}d late`
                                    : `${md}d`}
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <div className="pt-0.5 pb-1.5">
                      {visibleTasks.map((task) => {
                        const due = getDueMeta(task.dueDate, today, mode);
                        const done = optimisticTasks.get(
                          task.id,
                          task.doneToday
                        );
                        return (
                          <TaskRow
                            key={task.id}
                            task={{
                              id: task.id,
                              title: task.title,
                              done,
                              dueLabel: due?.label,
                              dueColor: due?.color,
                              estimateLabel: formatEstimate(
                                task.estimatedMinutes
                              ),
                              metaLabel: formatAddedAgo(
                                task.createdAt,
                                today,
                                mode
                              ),
                            }}
                            onToggle={() =>
                              void handleToggle(task.id, done)
                            }
                            onEdit={() => setEditingTask(task)}
                          />
                        );
                      })}
                      <CreateTaskDialog
                        projects={data.projects}
                        defaultProjectId={project.id}
                        trigger={
                          <button
                            type="button"
                            className="w-full py-2 pr-4 pl-11 text-left text-[12.5px] text-faint transition-colors duration-[120ms] hover:text-signal"
                          >
                            + Add task
                          </button>
                        }
                      />
                    </div>
                  </SurfaceCard>
                );
              })
            )}
          </div>

          {showTodayRail ? (
            <div className="order-1 min-w-0 dh:order-2">
              <div className="flex flex-col gap-3.5 dh:sticky dh:top-4 dh:max-h-[calc(100svh-4.75rem)] dh:overflow-y-auto dh:overscroll-contain dh:pr-0.5">
                {showHabits && (
                  <SurfaceCard variant="quiet">
                    <div className="flex items-baseline justify-between gap-3 px-4 pt-3 pb-2.5">
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
                    <div className="py-1">
                      <DailyChecklist tasks={data.dailyTasks} />
                    </div>
                  </SurfaceCard>
                )}

                {showInbox && !isFreshWorkspace && (
                  <InboxPanel
                    tasks={data.inboxTasks}
                    openCount={openInboxCount}
                    getDone={(id, fallback) =>
                      optimisticTasks.get(id, fallback)
                    }
                    onToggle={handleToggle}
                    onEdit={setEditingTask}
                    today={today}
                    mode={mode}
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
            <Button
              asChild
              variant="outline"
              className="w-full border-background/20 bg-transparent text-background hover:bg-background/10 hover:text-background sm:w-auto"
            >
              <Link href="/analytics">Full analytics →</Link>
            </Button>
          </section>
        )}
      </div>
    </div>
  );
}

function InboxPanel({
  tasks,
  openCount,
  getDone,
  onToggle,
  onEdit,
  today,
  mode,
}: {
  tasks: DashboardData["inboxTasks"];
  openCount: number;
  getDone: (id: string, fallback: boolean) => boolean;
  onToggle: (id: string, done: boolean) => void;
  onEdit: (task: EditableTask) => void;
  today: Date;
  mode: CalendarMode;
}) {
  return (
    <SurfaceCard variant="quiet">
      <div className="flex items-baseline justify-between gap-3 px-4 pt-3 pb-2">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold tracking-[-0.015em]">
            Inbox
          </h2>
          <p className="mt-0.5 text-[12px] text-faint">Unfiled</p>
        </div>
        {openCount > 0 ? (
          <span className="text-[12px] text-faint tabular-nums">
            {openCount}
          </span>
        ) : null}
      </div>
      {tasks.length === 0 ? (
        <p className="px-4 pt-1 pb-4 text-[13px] text-faint">Inbox clear.</p>
      ) : (
        <div className="pb-1.5">
          {sortCompletedLast(tasks, (task) =>
            getDone(task.id, task.doneToday)
          ).map((task) => {
            const due = getDueMeta(task.dueDate, today, mode);
            const done = getDone(task.id, task.doneToday);
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
                  metaLabel: formatAddedAgo(task.createdAt, today, mode),
                }}
                onToggle={() => onToggle(task.id, done)}
                onEdit={() => onEdit(task)}
              />
            );
          })}
        </div>
      )}
    </SurfaceCard>
  );
}
