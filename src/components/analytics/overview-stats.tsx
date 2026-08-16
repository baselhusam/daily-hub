"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import type { AnalyticsOverview } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function OverviewStats({ overview }: { overview: AnalyticsOverview }) {
  return (
    <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
      <Stat
        label="This week"
        value={String(overview.completionsThisWeek)}
        hint={
          overview.weekChangePercent !== undefined
            ? `${overview.weekChangePercent >= 0 ? "+" : ""}${overview.weekChangePercent}% vs last week`
            : undefined
        }
        trend={overview.weekChangePercent}
      />
      <Stat
        label="Open tasks"
        value={String(overview.openTasks)}
        hint={`${overview.completedTasks} completed`}
      />
      <Stat
        label="Completion"
        value={`${overview.completionRate}%`}
      />
      <Stat
        label="Habits today"
        value={`${overview.dailyConsistencyToday}%`}
      />
    </dl>
  );
}

function Stat({
  label,
  value,
  hint,
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: number;
}) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-[26px] font-semibold tabular-nums tracking-tight text-signal">
        {value}
      </dd>
      {hint && (
        <p className="mt-0.5 flex items-center gap-0.5 text-xs text-muted-foreground">
          {trend !== undefined && (
            <span className={cn(trend >= 0 ? "text-foreground" : undefined)}>
              {trend >= 0 ? (
                <ArrowUp className="mr-0.5 inline h-3 w-3" />
              ) : (
                <ArrowDown className="mr-0.5 inline h-3 w-3" />
              )}
            </span>
          )}
          {hint}
        </p>
      )}
    </div>
  );
}
