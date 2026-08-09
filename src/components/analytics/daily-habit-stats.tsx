"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntityIcon } from "@/components/dashboard/entity-icon";
import type { DailyTaskAnalytics } from "@/lib/analytics";

export function DailyHabitStats({ data }: { data: DailyTaskAnalytics[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Daily habit consistency (7 days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No daily tasks yet.</p>
        ) : (
          <div className="space-y-4">
            {data.map((task) => (
              <div key={task.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <EntityIcon
                      iconKey={task.iconKey}
                      size={14}
                      className="text-muted-foreground shrink-0"
                    />
                    <span className="truncate text-sm">{task.title}</span>
                  </div>
                  <span className="text-xs font-medium shrink-0">
                    {task.completedDays}/{task.windowDays} · {task.rate}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground/60 transition-all"
                    style={{ width: `${task.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
