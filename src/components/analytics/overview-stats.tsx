"use client";

import { motion } from "motion/react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  FolderKanban,
  ListTodo,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsOverview } from "@/lib/analytics";

type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ReactNode;
  trend?: number;
};

function StatCard({ label, value, hint, icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {(hint || trend !== undefined) && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            {trend !== undefined && (
              <span
                className={
                  trend >= 0 ? "text-foreground" : "text-muted-foreground"
                }
              >
                {trend >= 0 ? (
                  <ArrowUp className="mr-0.5 inline h-3 w-3" />
                ) : (
                  <ArrowDown className="mr-0.5 inline h-3 w-3" />
                )}
                {trend}%
              </span>
            )}
            {hint && <span>{hint}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OverviewStats({ overview }: { overview: AnalyticsOverview }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <StatCard
        label="Completions this week"
        value={overview.completionsThisWeek}
        trend={overview.weekChangePercent}
        hint="vs last week"
        icon={<TrendingUp className="h-4 w-4" />}
      />
      <StatCard
        label="Open tasks"
        value={overview.openTasks}
        hint={`${overview.completedTasks} completed total`}
        icon={<ListTodo className="h-4 w-4" />}
      />
      <StatCard
        label="Task completion rate"
        value={`${overview.completionRate}%`}
        hint="Across all tasks"
        icon={<CheckCircle2 className="h-4 w-4" />}
      />
      <StatCard
        label="Daily consistency"
        value={`${overview.dailyConsistencyToday}%`}
        hint={`${overview.totalDailyTasks} daily habits`}
        icon={<FolderKanban className="h-4 w-4" />}
      />
    </motion.div>
  );
}
