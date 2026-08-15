"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompletionsChart } from "@/components/analytics/completions-chart";
import type { CompletionDayPoint } from "@/lib/analytics";
import type { DashboardData } from "@/lib/dashboard";
import { formatDueDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { EntityIcon } from "./entity-icon";
import { TaskTable } from "./task-table";
import { DailyChecklist } from "./daily-checklist";
import { CreateTaskDialog } from "./create-task-dialog";

type DashboardShellProps = {
  data: DashboardData;
  chartData: CompletionDayPoint[];
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardShell({ data, chartData }: DashboardShellProps) {
  const router = useRouter();
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

  function setFilter(value: string | null) {
    if (!value || value === "all") {
      router.push("/");
      return;
    }
    router.push(`/?project=${value}`);
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {getGreeting()}
            </h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "EEEE, MMMM d")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/projects">Manage projects</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/daily">Manage daily</Link>
            </Button>
            <CreateTaskDialog
              businesses={data.businesses}
              projects={data.projects}
            />
          </div>
        </motion.header>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.06 },
            },
          }}
          className="space-y-6"
        >
          <motion.section
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
            className="grid grid-cols-2 gap-3 lg:grid-cols-12 lg:gap-4"
          >
            <StatCard
              className="lg:col-span-2"
              label="Open tasks"
              value={String(data.stats.openTasks)}
            />
            <StatCard
              className="lg:col-span-2"
              label="Overdue"
              value={String(data.stats.overdueTasks)}
              highlight={data.stats.overdueTasks > 0}
            />
            <StatCard
              className="lg:col-span-2"
              label="Daily today"
              value={`${data.stats.dailyCompleted}/${data.stats.dailyScheduled}`}
            />
            <StatCard
              className="lg:col-span-2"
              label="This week"
              value={String(data.stats.completionsThisWeek)}
            />
            <div className="col-span-2 lg:col-span-4">
              <CompletionsChart data={chartData} compact />
            </div>
          </motion.section>

          <motion.section
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Filter</span>
              <FilterChip
                active={!projectFilter || projectFilter === "all"}
                onClick={() => setFilter("all")}
              >
                All
              </FilterChip>
              <FilterChip
                active={projectFilter === "inbox"}
                onClick={() => setFilter("inbox")}
              >
                Inbox
              </FilterChip>
              {data.projects.map((project) => (
                <FilterChip
                  key={project.id}
                  active={projectFilter === project.id}
                  onClick={() => setFilter(project.id)}
                >
                  {project.name}
                </FilterChip>
              ))}
            </div>
          </motion.section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
            <motion.section
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              className="space-y-4 lg:col-span-8"
            >
              {filteredProjects.map((project) => (
                <Card key={project.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-background">
                        <EntityIcon
                          iconKey={project.iconKey}
                          logoUrl={project.logoUrl}
                          size={18}
                        />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-medium">
                          {project.name}
                        </CardTitle>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {project.description && (
                            <span className="text-xs text-muted-foreground">
                              {project.description}
                            </span>
                          )}
                          {project.dueDate && (
                            <Badge variant="outline" className="text-xs">
                              Due {formatDueDate(project.dueDate)}
                            </Badge>
                          )}
                          {project.business && (
                            <Badge variant="secondary" className="text-xs">
                              {project.business.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 pb-1">
                    <TaskTable
                      tasks={project.tasks}
                      emptyMessage="No open tasks for this project."
                    />
                  </CardContent>
                </Card>
              ))}

              {showInbox && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Inbox</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Tasks not linked to a project
                    </p>
                  </CardHeader>
                  <CardContent className="p-0 pb-1">
                    <TaskTable
                      tasks={data.inboxTasks}
                      emptyMessage="Inbox is clear."
                    />
                  </CardContent>
                </Card>
              )}
            </motion.section>

            <motion.section
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              className="lg:col-span-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium">Today&apos;s habits</h2>
                <Button variant="ghost" size="sm" className="h-8" asChild>
                  <Link href="/daily">Manage</Link>
                </Button>
              </div>
              <DailyChecklist tasks={data.dailyTasks} />
            </motion.section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  className,
  highlight,
}: {
  label: string;
  value: string;
  className?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={cn(
            "mt-1 text-2xl font-semibold tabular-nums tracking-tight",
            highlight && "text-destructive"
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
