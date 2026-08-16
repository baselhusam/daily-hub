"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import type { DashboardData } from "@/lib/dashboard";
import { formatDueDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { EntityIcon } from "./entity-icon";
import { TaskTable } from "./task-table";
import { DailyChecklist } from "./daily-checklist";
import { CreateTaskDialog } from "./create-task-dialog";

type DashboardShellProps = {
  data: DashboardData;
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardShell({ data }: DashboardShellProps) {
  const searchParams = useSearchParams();
  const projectFilter = searchParams.get("project");

  const filteredProjects =
    projectFilter === "inbox"
      ? []
      : projectFilter && projectFilter !== "all"
        ? data.projects.filter((project) => project.id === projectFilter)
        : data.projects;

  const showInbox =
    !projectFilter || projectFilter === "all" || projectFilter === "inbox";

  const showHabits = !projectFilter || projectFilter === "all";
  const selectedProject = filteredProjects[0];
  const heading =
    projectFilter === "inbox"
      ? "Inbox"
      : selectedProject && projectFilter
        ? selectedProject.name
        : getGreeting();

  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[32px] leading-[1.1] tracking-[-0.04em]">
              {heading}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {format(new Date(), "EEEE, MMMM d")}
            </p>
          </div>
          <CreateTaskDialog
            businesses={data.businesses}
            projects={data.projects}
            defaultProjectId={
              selectedProject && projectFilter ? selectedProject.id : undefined
            }
          />
        </header>

        {showHabits && (
          <dl className="mb-10 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <StatItem
              label="Open"
              value={String(data.stats.openTasks)}
            />
            <StatItem
              label="Overdue"
              value={String(data.stats.overdueTasks)}
              highlight={data.stats.overdueTasks > 0}
            />
            <StatItem
              label="Habits"
              value={`${data.stats.dailyCompleted}/${data.stats.dailyScheduled}`}
            />
            <StatItem
              label="This week"
              value={String(data.stats.completionsThisWeek)}
            />
          </dl>
        )}

        <div className="space-y-10">
          {showHabits && (
            <section>
              <SectionTitle>Today</SectionTitle>
              <DailyChecklist tasks={data.dailyTasks} />
            </section>
          )}

          {filteredProjects
            .filter((project) => projectFilter || project.tasks.length > 0)
            .map((project) => (
            <section key={project.id}>
              {showHabits ? (
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <EntityIcon
                      iconKey={project.iconKey}
                      logoUrl={project.logoUrl}
                      size={16}
                      className="shrink-0 text-muted-foreground"
                    />
                    <h2 className="truncate text-[21px] tracking-[-0.025em]">
                      {project.name}
                    </h2>
                  </div>
                  <p className="shrink-0 text-sm text-muted-foreground">
                    {project.tasks.length} open
                    {project.dueDate ? ` · ${formatDueDate(project.dueDate)}` : ""}
                  </p>
                </div>
              ) : (
                project.description && (
                  <p className="mb-3 text-sm text-muted-foreground">
                    {project.description}
                    {project.dueDate ? ` · due ${formatDueDate(project.dueDate)}` : ""}
                  </p>
                )
              )}
              <TaskTable
                tasks={project.tasks}
                emptyMessage="No open tasks."
              />
            </section>
          ))}

          {showInbox && (
            <section>
              {showHabits && <SectionTitle>Inbox</SectionTitle>}
              <TaskTable
                tasks={data.inboxTasks}
                emptyMessage="Inbox is clear."
              />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 text-[21px] tracking-[-0.025em]">{children}</h2>
  );
}

function StatItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "font-medium tabular-nums",
          highlight && "text-destructive font-semibold"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
