"use client";

import { format } from "date-fns";
import type { AnalyticsData } from "@/lib/analytics";
import { OverviewStats } from "./overview-stats";
import { CompletionsChart } from "./completions-chart";
import { BusinessChart } from "./business-chart";
import { ProjectTable } from "./project-table";
import { DailyHabitStats } from "./daily-habit-stats";

export function AnalyticsShell({ data }: { data: AnalyticsData }) {
  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-3xl space-y-10">
        <header>
          <h1 className="text-[32px] leading-[1.1] tracking-[-0.04em]">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            How the last couple of weeks have gone.
          </p>
        </header>

        <OverviewStats overview={data.overview} />

        <section>
          <h2 className="mb-4 text-[21px] tracking-[-0.025em]">
            Activity
          </h2>
          <CompletionsChart data={data.completionsByDay} />
        </section>

        <section>
          <h2 className="mb-4 text-[21px] tracking-[-0.025em]">
            By business
          </h2>
          <BusinessChart data={data.byBusiness} />
        </section>

        <section>
          <h2 className="mb-4 text-[21px] tracking-[-0.025em]">
            Projects
          </h2>
          <ProjectTable data={data.byProject} />
        </section>

        <section>
          <h2 className="mb-4 text-[21px] tracking-[-0.025em]">
            Habits
          </h2>
          <DailyHabitStats data={data.dailyTaskStats} />
        </section>

        <p className="text-xs text-muted-foreground">
          Updated {format(new Date(), "PPp")}
        </p>
      </div>
    </div>
  );
}
