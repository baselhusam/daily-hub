"use client";

import { motion } from "motion/react";
import { format } from "date-fns";
import type { AnalyticsData } from "@/lib/analytics";
import { OverviewStats } from "./overview-stats";
import { CompletionsChart } from "./completions-chart";
import { BusinessChart } from "./business-chart";
import { ProjectTable } from "./project-table";
import { DailyHabitStats } from "./daily-habit-stats";
import { Badge } from "@/components/ui/badge";

export function AnalyticsShell({ data }: { data: AnalyticsData }) {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Performance across tasks, businesses, and projects
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {data.overview.activeBusinesses} businesses
            </Badge>
            <Badge variant="secondary">
              {data.overview.activeProjects} active projects
            </Badge>
            <Badge variant="outline">
              {data.overview.totalCompletions} total completions
            </Badge>
          </div>
        </motion.header>

        <OverviewStats overview={data.overview} />

        <div className="grid gap-4 lg:grid-cols-2">
          <CompletionsChart data={data.completionsByDay} />
          <BusinessChart data={data.byBusiness} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ProjectTable data={data.byProject} />
          <DailyHabitStats data={data.dailyTaskStats} />
        </div>

        <p className="text-xs text-muted-foreground">
          Updated {format(new Date(), "PPp")}
        </p>
      </div>
    </div>
  );
}
