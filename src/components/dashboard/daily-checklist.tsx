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
      <div className="px-[18px] py-5">
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
          className="border-b border-destructive/20 bg-destructive-wash px-[18px] py-2.5 text-[13px] text-destructive"
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
            className="group relative flex items-center gap-3 border-b border-rule-soft px-[18px] py-3 last:border-0 hover:bg-canvas-sunk"
          >
            <Checkbox
              checked={done}
              onCheckedChange={() => void handleToggle(task.id, done)}
              className="relative z-10 size-[22px]"
              aria-label={`Toggle ${task.title}`}
            />
            <EntityAvatar
              name={task.title}
              logoUrl={task.logoUrl}
              iconKey={task.iconKey}
              size={28}
              rounded="lg"
            />
            <div className="relative min-w-0 flex-1">
              <div
                className={cn(
                  "text-[14.5px] font-semibold leading-snug",
                  done && "text-muted-foreground"
                )}
              >
                {task.title}
              </div>
              <div className="mt-0.5 text-[12px] text-faint">
                {task.carriedOver
                  ? `${task.scheduleLabel} · carried over`
                  : task.scheduleLabel}
              </div>
              {done && (
                <span className="pointer-events-none absolute top-[9px] left-0 h-[1.5px] w-full max-w-[420px] bg-hairline" />
              )}
            </div>
            {done && (
              <>
                <span className="text-[11px] font-semibold tracking-[0.08em] text-signal tabular-nums">
                  DONE
                </span>
                <span className="pointer-events-none absolute inset-0 bg-white/62 dark:bg-background/50" />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
