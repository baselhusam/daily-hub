"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Inbox, X } from "lucide-react";
import type { DashboardData } from "@/lib/dashboard";
import { daysUntil, formatEstimate } from "@/lib/streak";
import { getDueMeta, getDeadlineColor } from "@/lib/due-meta";
import { getTodayDate } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { QuickAdd } from "@/components/ui/quick-add";
import { NudgeChip } from "@/components/ui/nudge-chip";
import { SnapshotCard } from "@/components/ui/snapshot-card";
import { SurfaceCard, SurfaceCardHeader } from "@/components/ui/surface-card";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TaskRow } from "@/components/ui/task-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DailyChecklist } from "./daily-checklist";
import { CreateTaskDialog } from "./create-task-dialog";
import { completeTask } from "@/app/actions/tasks";

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

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const prefix =
    hour < 5
      ? "Still up, "
      : hour < 12
        ? "Good morning, "
        : hour < 17
          ? "Good afternoon, "
          : "Good evening, ";
  return `${prefix}${name}.`;
}

export function DashboardShell({ data }: DashboardShellProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectFilter = searchParams.get("project");
  const [pendingTaskId, setPendingTaskId] = React.useState<string | null>(null);
  const [editingTask, setEditingTask] = React.useState<EditableTask | null>(null);
  const today = getTodayDate();

  React.useEffect(() => {
    const id = window.location.hash.replace("#", "");
    if (!id) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [projectFilter]);

  const filteredProjects =
    projectFilter && projectFilter !== "all" && projectFilter !== "inbox"
      ? data.projects.filter((p) => p.id === projectFilter)
      : data.projects;

  const showInbox =
    !projectFilter || projectFilter === "all" || projectFilter === "inbox";
  const showHabits = !projectFilter || projectFilter === "all";
  const filterProject = data.projects.find((p) => p.id === projectFilter);

  const habitProgress =
    data.stats.dailyScheduled === 0
      ? 0
      : Math.round(
          (data.stats.dailyCompleted / data.stats.dailyScheduled) * 100
        );

  async function handleComplete(taskId: string) {
    setPendingTaskId(taskId);
    await completeTask(taskId);
    setPendingTaskId(null);
  }

  return (
    <div className="page-gutter animate-dh-fade py-[clamp(18px,2.6vw,32px)] pb-28">
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
      <div className="mx-auto flex max-w-[1080px] flex-col gap-5">
        <PageHeader
          eyebrow={format(today, "EEEE · MMMM d, yyyy")}
          title={getGreeting(data.settings.displayName)}
          description={
            data.stats.overdueTasks > 0
              ? `${data.stats.overdueTasks} overdue · ${data.stats.openTasks} still open today.`
              : `${data.stats.openTasks} open · ${data.stats.dailyCompleted}/${data.stats.dailyScheduled} habits done.`
          }
          actions={
            filterProject ? undefined : (
              <CreateTaskDialog
                projects={data.projects}
              />
            )
          }
        />

        {filterProject && (
          <div className="flex items-center gap-2 rounded-full border border-border bg-card py-1.5 pr-2 pl-2">
            <EntityAvatar
              name={filterProject.name}
              color={filterProject.color}
              logoUrl={filterProject.logoUrl}
              iconKey={filterProject.iconKey}
              size={22}
            />
            <span className="text-[13px] font-semibold">
              Filtered · {filterProject.name}
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

        {showHabits && (
          <QuickAdd
            projects={data.projects.map((p) => ({
              id: p.id,
              name: p.name,
              iconKey: p.iconKey,
              logoUrl: p.logoUrl,
              color: p.color,
            }))}
            defaultProjectId={filterProject?.id}
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
              {data.snapshots.map((snapshot) => (
                <SnapshotCard key={snapshot.label} {...snapshot} />
              ))}
            </div>
          </section>
        )}

        {showHabits && (
          <SurfaceCard>
            <SurfaceCardHeader className="!py-3.5">
              <div className="flex w-full items-center justify-between gap-3">
                <div className="flex items-baseline gap-2.5">
                  <h2 className="text-[11px] font-semibold tracking-[0.02em] text-muted-foreground">
                    Today&apos;s habits
                  </h2>
                  <span className="text-[12px] font-medium text-faint tabular-nums">
                    {data.stats.dailyCompleted}/{data.stats.dailyScheduled}
                  </span>
                </div>
                <ProgressBar
                  value={habitProgress}
                  className="max-w-[180px] flex-1"
                />
              </div>
            </SurfaceCardHeader>
            <DailyChecklist tasks={data.dailyTasks} />
          </SurfaceCard>
        )}

        <div className="flex flex-col gap-3.5">
          <div className="flex items-baseline justify-between gap-3 px-0.5">
            <h2 className="section-kicker flex-1">
              Open work
            </h2>
            <span className="text-[11.5px] tracking-[0.1em] text-faint tabular-nums">
              {data.stats.openTasks} open
            </span>
          </div>

          {filteredProjects.map((project) => {
            const dl = daysUntil(project.dueDate, today);
            const visibleTasks = project.tasks;

              return (
                <SurfaceCard key={project.id}>
                  <SurfaceCardHeader sunk>
                    <div className="flex w-full flex-wrap items-center gap-3">
                      <EntityAvatar
                        name={project.name}
                        color={project.color}
                        logoUrl={project.logoUrl}
                        iconKey={project.iconKey}
                        size={30}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-[15px] font-semibold tracking-[-0.01em]">
                          {project.name}
                        </span>
                        <p className="mt-0.5 text-[12px] text-faint">
                          {project.openCount} open · {project.doneCount} logged
                        </p>
                      </div>
                      {dl !== null && (
                        <div className="text-right">
                          <div
                            className="text-[14px] font-semibold tabular-nums leading-none"
                            style={{ color: getDeadlineColor(dl) }}
                          >
                            {dl < 0 ? `${Math.abs(dl)}d late` : `${dl}d`}
                          </div>
                          <div className="mt-0.5 text-[11.5px] text-faint">
                            to deadline
                          </div>
                        </div>
                      )}
                    </div>
                  </SurfaceCardHeader>

                  {project.milestones.filter((m) => !m.done).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 border-b border-rule-soft bg-canvas-sunk px-[18px] py-2.5">
                      {project.milestones
                        .filter((m) => !m.done)
                        .slice(0, 3)
                        .map((milestone) => {
                          const md = daysUntil(milestone.dueDate, today);
                          return (
                            <Badge
                              key={milestone.id}
                              variant="filter"
                              dotColor={
                                md !== null && md <= 7 ? "var(--signal)" : "var(--hairline)"
                              }
                              className="gap-1.5"
                            >
                              {milestone.name}
                              {md !== null && (
                                <span className="text-faint tabular-nums">
                                  {md < 0 ? `${Math.abs(md)}d late` : `${md}d`}
                                </span>
                              )}
                            </Badge>
                          );
                        })}
                    </div>
                  )}

                  <div>
                    {visibleTasks.map((task) => {
                      const due = getDueMeta(task.dueDate, today);
                      return (
                        <TaskRow
                          key={task.id}
                          task={{
                            id: task.id,
                            title: task.title,
                            done: task.doneToday,
                            dueLabel: due?.label,
                            dueColor: due?.color,
                            dueBg: due?.bg,
                            estimateLabel: formatEstimate(task.estimatedMinutes),
                          }}
                          pending={pendingTaskId === task.id}
                          onToggle={() => void handleComplete(task.id)}
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
                          className="w-full px-[18px] py-3 text-left text-[13px] font-semibold text-faint transition-colors hover:bg-paper hover:text-signal"
                        >
                          + Add task to {project.name}
                        </button>
                      }
                    />
                  </div>
                </SurfaceCard>
              );
            })}
        </div>

        {showInbox && (
          <SurfaceCard variant="paper">
            <SurfaceCardHeader>
              <div className="flex w-full items-center gap-3">
                <span className="grid h-[30px] w-[30px] place-items-center rounded-md bg-border text-muted-foreground">
                  <Inbox className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <div className="text-[15px] font-semibold">Inbox</div>
                  <div className="mt-0.5 text-[12px] text-faint">
                    No project yet · file these or finish them
                  </div>
                </div>
                <span className="text-[13px] font-semibold text-muted-foreground tabular-nums">
                  {data.inboxTasks.filter((t) => !t.doneToday).length}
                </span>
              </div>
            </SurfaceCardHeader>
            {data.inboxTasks.length === 0 ? (
              <p className="px-[18px] py-5 text-[13.5px] text-faint">
                Inbox clear.
              </p>
            ) : (
              <div>
                {data.inboxTasks.map((task) => {
                    const due = getDueMeta(task.dueDate, today);
                    return (
                      <TaskRow
                        key={task.id}
                        task={{
                          id: task.id,
                          title: task.title,
                          done: task.doneToday,
                          dueLabel: due?.label,
                          dueColor: due?.color,
                          dueBg: due?.bg,
                          estimateLabel: formatEstimate(task.estimatedMinutes),
                        }}
                        pending={pendingTaskId === task.id}
                        onToggle={() => void handleComplete(task.id)}
                        onEdit={() => setEditingTask(task)}
                      />
                    );
                  })}
              </div>
            )}
          </SurfaceCard>
        )}

        {showHabits && (
          <section className="flex flex-wrap items-center gap-6 rounded-[12px] border border-foreground bg-foreground p-5 text-background shadow-float">
            <div className="min-w-[220px] flex-1">
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
              className="border-background/20 bg-transparent text-background hover:bg-background/10 hover:text-background"
            >
              <Link href="/analytics">Full analytics →</Link>
            </Button>
          </section>
        )}
      </div>
    </div>
  );
}
