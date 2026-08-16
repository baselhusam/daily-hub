"use client";

import * as React from "react";
import Link from "next/link";
import { toggleDailyTask } from "@/app/actions/daily-tasks";
import { Checkbox } from "@/components/ui/checkbox";
import { EntityAvatar } from "@/components/ui/entity-avatar";
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
      <div className="px-[18px] py-5">
        <EmptyState
          title="Nothing scheduled for today"
          description={
            <>
              Add one thing, or{" "}
              <Link
                href="/daily"
                className="font-semibold text-signal hover:text-[#1A7BD4]"
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
      {tasks.map((task) => (
        <div
          key={task.id}
          className="group relative flex items-center gap-3 border-b border-rule-soft px-[18px] py-3 last:border-0 hover:bg-canvas-sunk"
        >
          <Checkbox
            checked={task.completedToday}
            disabled={pendingId === task.id}
            onCheckedChange={() => void handleToggle(task.id)}
            className="size-[22px]"
            aria-label={`Toggle ${task.title}`}
          />
          <EntityAvatar
            name={task.title}
            logoUrl={task.logoUrl}
            size={28}
            rounded="lg"
          />
          <div className="relative min-w-0 flex-1">
            <div
              className={cn(
                "text-[14.5px] font-semibold leading-snug",
                task.completedToday && "text-muted-foreground"
              )}
            >
              {task.title}
            </div>
            <div className="mt-0.5 text-[12px] text-faint">
              {task.scheduleLabel}
            </div>
            {task.completedToday && (
              <span className="pointer-events-none absolute top-[9px] left-0 h-[1.5px] w-full max-w-[420px] bg-[#A3A29E]" />
            )}
          </div>
          {task.completedToday && (
            <>
              <span className="text-[11px] font-semibold tracking-[0.08em] text-signal tabular-nums">
                DONE
              </span>
              <span className="pointer-events-none absolute inset-0 bg-white/62 dark:bg-background/50" />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
