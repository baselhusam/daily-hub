"use client";

import { Trash2, Pencil } from "lucide-react";
import { deleteDailyTask } from "@/app/actions/daily-tasks";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { DayPills } from "@/components/ui/day-pills";
import { ChainDots } from "@/components/ui/chain-dots";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/brand-mark";
import { DailyTaskFormDialog } from "./daily-task-form-dialog";

type DailyTaskRecord = {
  id: string;
  title: string;
  iconKey: string;
  logoUrl: string | null;
  weekdays: number[];
  isActive: boolean;
  scheduleLabel: string;
  rate: number;
  dots: Array<{ color: string }>;
};

type DailyShellProps = {
  dailyTasks: DailyTaskRecord[];
};

export function DailyShell({ dailyTasks }: DailyShellProps) {
  return (
    <div className="page-gutter animate-dh-fade py-[clamp(18px,2.6vw,32px)] pb-28">
      <div className="mx-auto flex max-w-[1080px] flex-col gap-5">
        <PageHeader
          eyebrow="Recurring"
          title="Habits"
          description="Set the schedule here. Check them off on Today."
          actions={<DailyTaskFormDialog />}
        />

        {dailyTasks.length === 0 ? (
          <EmptyState
            title="No habits yet"
            description="Create one to build your routine."
          />
        ) : (
          <SurfaceCard>
            {dailyTasks.map((task) => (
              <div
                key={task.id}
                className="flex flex-wrap items-center gap-3.5 border-b border-rule-soft px-[18px] py-4 last:border-0"
              >
                <EntityAvatar
                  name={task.title}
                  logoUrl={task.logoUrl}
                  iconKey={task.iconKey}
                  size={36}
                  rounded="lg"
                />
                <div className="min-w-0 flex-1 basis-[180px]">
                  <div className="text-[15px] font-semibold">{task.title}</div>
                  <div className="mt-0.5 text-[12px] text-faint">
                    {task.scheduleLabel}
                    {task.isActive ? "" : " · Paused"}
                  </div>
                </div>
                <DayPills activeDays={task.weekdays} />
                <div className="flex min-w-[150px] items-center gap-3.5">
                  <ChainDots dots={task.dots} size="md" className="gap-[2.5px]" />
                  <span
                    className="text-[13px] font-semibold tabular-nums"
                    style={{
                      color:
                        task.rate >= 80
                          ? "#448361"
                          : task.rate >= 50
                            ? "#787774"
                            : "#C4554D",
                    }}
                  >
                    {task.rate}%
                  </span>
                </div>
                <div className="flex gap-0.5">
                  <DailyTaskFormDialog
                    task={{
                      id: task.id,
                      title: task.title,
                      iconKey: task.iconKey,
                      logoUrl: task.logoUrl,
                      weekdays: task.weekdays,
                      isActive: task.isActive,
                    }}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#C7C6C2]">
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit habit</span>
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#C7C6C2] hover:text-destructive"
                    onClick={() => deleteDailyTask(task.id)}
                    aria-label="Delete habit"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </SurfaceCard>
        )}
      </div>
    </div>
  );
}
