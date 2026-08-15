"use client";

import { Trash2, Pencil } from "lucide-react";
import { deleteDailyTask } from "@/app/actions/daily-tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntityIcon } from "@/components/dashboard/entity-icon";
import { DailyTaskFormDialog } from "./daily-task-form-dialog";
import { WEEKDAY_LABELS } from "@/lib/dates";

type DailyTaskRecord = {
  id: string;
  title: string;
  iconKey: string;
  logoUrl: string | null;
  weekdays: number[];
  isActive: boolean;
  businessId: string | null;
  business: { id: string; name: string } | null;
};

type DailyShellProps = {
  dailyTasks: DailyTaskRecord[];
  businesses: Array<{ id: string; name: string }>;
};

function formatWeekdays(weekdays: number[]): string {
  if (weekdays.length === 7) return "Every day";
  return weekdays
    .slice()
    .sort((a, b) => a - b)
    .map((day) => WEEKDAY_LABELS[day])
    .join(" ");
}

export function DailyShell({ dailyTasks, businesses }: DailyShellProps) {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Daily tasks</h1>
            <p className="text-sm text-muted-foreground">
              Define habits with logos and weekday schedules.
            </p>
          </div>
          <DailyTaskFormDialog businesses={businesses} />
        </header>

        {dailyTasks.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">
            No daily tasks yet. Create one to build your routine.
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {dailyTasks.map((task) => (
              <Card key={task.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
                      <EntityIcon
                        iconKey={task.iconKey}
                        logoUrl={task.logoUrl}
                        size={20}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-base">{task.title}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatWeekdays(task.weekdays)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <DailyTaskFormDialog
                      businesses={businesses}
                      task={{
                        id: task.id,
                        title: task.title,
                        iconKey: task.iconKey,
                        logoUrl: task.logoUrl,
                        weekdays: task.weekdays,
                        businessId: task.businessId,
                        isActive: task.isActive,
                      }}
                      trigger={
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit daily task</span>
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => deleteDailyTask(task.id)}
                      aria-label="Delete daily task"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2">
                  <Badge variant={task.isActive ? "secondary" : "outline"}>
                    {task.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {task.business && (
                    <Badge variant="outline">{task.business.name}</Badge>
                  )}
                  <div className="flex gap-1">
                    {WEEKDAY_LABELS.map((label, index) => (
                      <span
                        key={index}
                        className={
                          task.weekdays.includes(index)
                            ? "flex h-6 w-6 items-center justify-center rounded border bg-foreground text-[10px] font-medium text-background"
                            : "flex h-6 w-6 items-center justify-center rounded border text-[10px] text-muted-foreground"
                        }
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
