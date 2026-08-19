"use client";

import * as React from "react";
import { Trash2, Pencil } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import {
  habitStatusFilterOptions,
  StatusChip,
} from "@/components/ui/option-mark";
import { SelectMenu } from "@/components/ui/select-menu";
import { DayPills } from "@/components/ui/day-pills";
import { ChainDots } from "@/components/ui/chain-dots";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/brand-mark";
import { DailyTaskFormDialog } from "./daily-task-form-dialog";
import {
  DeleteDailyTaskDialog,
  type DeleteDailyTaskTarget,
} from "./delete-daily-task-dialog";

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
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "true" | "false"
  >("all");
  const [pendingDelete, setPendingDelete] =
    React.useState<DeleteDailyTaskTarget | null>(null);
  const visibleTasks =
    statusFilter === "all"
      ? dailyTasks
      : dailyTasks.filter((task) =>
          statusFilter === "true" ? task.isActive : !task.isActive
        );

  React.useEffect(() => {
    const id = window.location.hash.replace("#", "");
    if (!id) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="page-gutter animate-dh-fade py-[clamp(18px,2.6vw,32px)]">
      <div className="mx-auto flex max-w-[1080px] flex-col gap-5">
        <PageHeader
          eyebrow="Recurring"
          title="Habits"
          description="Set the schedule here. Check them off on Today."
          actions={
            <>
              {dailyTasks.length > 0 ? (
                <SelectMenu
                  value={statusFilter}
                  onValueChange={(next) =>
                    setStatusFilter(next as "all" | "true" | "false")
                  }
                  options={habitStatusFilterOptions()}
                  variant="compact"
                  ariaLabel="Filter by status"
                  className="min-w-0 w-full sm:w-auto sm:min-w-[148px]"
                  contentClassName="min-w-[180px]"
                />
              ) : null}
              <DailyTaskFormDialog />
            </>
          }
        />

        {dailyTasks.length === 0 ? (
          <EmptyState
            title="No habits yet"
            description="Create one to build your routine."
          >
            <DailyTaskFormDialog
              trigger={
                <Button size="sm" className="mt-1 h-9 px-4 text-[13.5px] font-semibold">
                  Create habit
                </Button>
              }
            />
          </EmptyState>
        ) : visibleTasks.length === 0 ? (
          <EmptyState
            title="Nothing in this status"
            description="Try another status, or create a habit."
          />
        ) : (
          <SurfaceCard>
            {visibleTasks.map((task) => (
              <div
                id={`habit-${task.id}`}
                key={task.id}
                className="group grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-3.5 scroll-mt-24 border-b border-rule-soft px-[18px] py-4 transition-colors duration-[120ms] last:border-0 hover:bg-canvas-sunk target:bg-signal-wash sm:grid-cols-[36px_minmax(180px,1fr)_auto_minmax(132px,auto)_auto]"
              >
                <EntityAvatar
                  name={task.title}
                  logoUrl={task.logoUrl}
                  iconKey={task.iconKey}
                  size={36}
                  rounded="lg"
                />
                <div className="min-w-0 flex-1 basis-[180px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-[15px] font-semibold">{task.title}</div>
                    {!task.isActive ? <StatusChip active={false} /> : null}
                  </div>
                  <div className="mt-0.5 text-[12px] text-faint">
                    {task.scheduleLabel}
                  </div>
                </div>
                <DayPills
                  activeDays={task.weekdays}
                  className="col-span-3 sm:col-span-1"
                />
                <div className="col-span-2 flex items-center gap-3.5 border-t border-rule-soft pt-3 sm:col-span-1 sm:border-0 sm:pt-0">
                  <ChainDots
                    dots={task.dots}
                    size="md"
                    className="w-[112px] flex-none gap-[2.5px]"
                  />
                  <span
                    className="text-[13px] font-semibold tabular-nums"
                    style={{
                      color:
                        task.rate >= 80
                          ? "var(--done)"
                          : task.rate >= 50
                            ? "var(--muted-foreground)"
                            : "var(--destructive)",
                    }}
                  >
                    {task.rate}%
                  </span>
                </div>
                <div className="flex justify-self-end gap-0.5">
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-hairline sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit habit</span>
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-hairline hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                    onClick={() =>
                      setPendingDelete({
                        id: task.id,
                        title: task.title,
                        iconKey: task.iconKey,
                        logoUrl: task.logoUrl,
                      })
                    }
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
      <DeleteDailyTaskDialog
        task={pendingDelete}
        open={pendingDelete !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingDelete(null);
        }}
      />
    </div>
  );
}
