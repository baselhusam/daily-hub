"use client";

import * as React from "react";
import Link from "next/link";
import { toggleDailyTask } from "@/app/actions/daily-tasks";
import { Checkbox } from "@/components/ui/checkbox";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { EmptyState } from "@/components/brand-mark";
import type { DashboardDailyTask } from "@/lib/dashboard";
import { useOptimisticFlags } from "@/lib/optimistic-toggle";
import { cn, sortCompletedLast } from "@/lib/utils";

type DailyChecklistProps = {
  tasks: DashboardDailyTask[];
};

export function DailyChecklist({ tasks }: DailyChecklistProps) {
  const [error, setError] = React.useState<string | null>(null);
  const taskFlags = React.useMemo(
    () => tasks.map((task) => ({ id: task.id, value: task.completedToday })),
    [tasks]
  );
  const optimisticHabits = useOptimisticFlags(taskFlags);

  async function handleToggle(taskId: string, currentlyDone: boolean) {
    setError(null);
    try {
      const result = await optimisticHabits.run(taskId, currentlyDone, () =>
        toggleDailyTask(taskId)
      );
      if (!result.success) {
        setError(result.error ?? "Could not update this habit. Try again.");
      }
    } catch {
      setError("Could not update this habit. Try again.");
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="px-4 py-4">
        <EmptyState
          title="Nothing scheduled for today"
          description={
            <>
              Add one thing, or{" "}
              <Link
                href="/daily"
                className="font-semibold text-signal hover:text-signal-hover"
              >
                manage habits
              </Link>
              .
            </>
          }
        />
      </div>
    );
  }

  return (
    <div>
      {error ? (
        <p
          role="alert"
          aria-live="polite"
          className="px-4 py-2 text-[13px] text-destructive"
        >
          {error}
        </p>
      ) : null}
      {sortCompletedLast(tasks, (task) =>
        optimisticHabits.get(task.id, task.completedToday)
      ).map((task) => {
        const done = optimisticHabits.get(task.id, task.completedToday);
        return (
          <div
            key={task.id}
            className="group flex items-center gap-2.5 px-4 py-2 transition-colors duration-[120ms] hover:bg-canvas-sunk"
          >
            <Checkbox
              checked={done}
              onCheckedChange={() => void handleToggle(task.id, done)}
              aria-label={`Toggle ${task.title}`}
            />
            <EntityAvatar
              name={task.title}
              logoUrl={task.logoUrl}
              iconKey={task.iconKey}
              size={20}
            />
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "text-[14px] leading-snug",
                  done && "text-muted-foreground line-through decoration-hairline"
                )}
              >
                {task.title}
              </div>
              <div className="mt-0.5 text-[11.5px] text-faint">
                {task.carriedOver
                  ? `${task.scheduleLabel} · carried over`
                  : task.scheduleLabel}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
