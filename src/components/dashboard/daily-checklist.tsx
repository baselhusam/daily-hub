"use client";

import * as React from "react";
import { toggleDailyTask } from "@/app/actions/daily-tasks";
import { Checkbox } from "@/components/ui/checkbox";
import { EntityIcon } from "./entity-icon";
import { EmptyState } from "@/components/brand-mark";
import type { DashboardDailyTask } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

type DailyChecklistProps = {
  tasks: DashboardDailyTask[];
};

export function DailyChecklist({ tasks }: DailyChecklistProps) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function handleToggle(taskId: string) {
    setPendingId(taskId);
    await toggleDailyTask(taskId);
    setPendingId(null);
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="Nothing scheduled for today"
        description={
          <>
            Add one thing, or{" "}
            <a href="/daily" className="font-semibold text-signal hover:text-[#1A7BD4]">
              manage habits
            </a>
            .
          </>
        }
      />
    );
  }

  return (
    <ul>
      {tasks.map((task) => (
        <li
          key={task.id}
          className="flex items-center gap-3 border-b border-border/70 py-2.5 last:border-0"
        >
          <Checkbox
            checked={task.completedToday}
            disabled={pendingId === task.id}
            onCheckedChange={() => handleToggle(task.id)}
            aria-label={`Toggle ${task.title}`}
          />
          <EntityIcon
            iconKey={task.iconKey}
            logoUrl={task.logoUrl}
            size={16}
            className="shrink-0 text-muted-foreground"
          />
          <span
            className={cn(
              "text-[15px] leading-snug",
              task.completedToday && "text-muted-foreground line-through"
            )}
          >
            {task.title}
          </span>
        </li>
      ))}
    </ul>
  );
}
