"use client";

import { EntityIcon } from "@/components/dashboard/entity-icon";
import type { DailyTaskAnalytics } from "@/lib/analytics";

export function DailyHabitStats({ data }: { data: DailyTaskAnalytics[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No habits yet.</p>;
  }

  return (
    <ul className="space-y-4">
      {data.map((task) => (
        <li key={task.id} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <EntityIcon
                iconKey={task.iconKey}
                size={14}
                className="shrink-0 text-muted-foreground"
              />
              <span className="truncate text-[15px]">{task.title}</span>
            </div>
            <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
              {task.completedDays}/{task.windowDays} · {task.rate}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-signal"
              style={{ width: `${task.rate}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
