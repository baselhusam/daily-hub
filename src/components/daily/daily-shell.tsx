"use client";

import { Trash2, Pencil } from "lucide-react";
import { deleteDailyTask } from "@/app/actions/daily-tasks";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/brand-mark";
import { EntityIcon } from "@/components/dashboard/entity-icon";
import { DailyTaskFormDialog } from "./daily-task-form-dialog";
import { formatWeekdays } from "@/lib/dates";

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

export function DailyShell({ dailyTasks, businesses }: DailyShellProps) {
  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[32px] leading-[1.1] tracking-[-0.04em]">
              Habits
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Recurring check-ins for the week.
            </p>
          </div>
          <DailyTaskFormDialog businesses={businesses} />
        </header>

        {dailyTasks.length === 0 ? (
          <EmptyState
            title="No habits yet"
            description="Create one to build your routine."
          />
        ) : (
          <ul>
            {dailyTasks.map((task) => (
              <li
                key={task.id}
                className="group flex items-start gap-3 border-b border-border/70 py-4 last:border-0"
              >
                <EntityIcon
                  iconKey={task.iconKey}
                  logoUrl={task.logoUrl}
                  size={20}
                  className="mt-0.5 shrink-0 text-muted-foreground"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium leading-snug">
                    {task.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatWeekdays(task.weekdays)}
                    {task.isActive ? "" : " · Paused"}
                    {task.business ? ` · ${task.business.name}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:focus-within:opacity-100">
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
                        <span className="sr-only">Edit habit</span>
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => deleteDailyTask(task.id)}
                    aria-label="Delete habit"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
