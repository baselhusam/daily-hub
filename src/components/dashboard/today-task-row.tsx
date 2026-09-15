"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type DuePill = {
  label: string;
  tone: "late" | "today" | "muted";
};

export type TodayTaskRowData = {
  id: string;
  title: string;
  note?: string;
  meta?: string;
  estimate?: string;
  due?: DuePill | null;
  done: boolean;
  overdue?: boolean;
};

type TodayTaskRowProps = {
  task: TodayTaskRowData;
  onToggle: () => void;
  onEdit?: () => void;
  /** Slightly denser row for the right rail. */
  compact?: boolean;
  className?: string;
};

const PILL_TONES: Record<DuePill["tone"], string> = {
  late: "bg-destructive-wash text-destructive",
  today: "bg-signal-soft text-signal",
  muted: "bg-paper text-muted-foreground",
};

/**
 * One task inside a project group or the Inbox. The whole row is a target —
 * clicking anywhere toggles the task — with the pencil stopping propagation.
 * The checkbox stays a real control so keyboard and screen-reader users get
 * the same affordance.
 */
export function TodayTaskRow({
  task,
  onToggle,
  onEdit,
  compact = false,
  className,
}: TodayTaskRowProps) {
  return (
    <div
      id={`task-${task.id}`}
      data-overdue={task.overdue ? "" : undefined}
      onClick={onToggle}
      className={cn(
        "group flex cursor-pointer items-start gap-[11px] scroll-mt-28 px-4 transition-colors duration-[120ms] hover:bg-canvas-sunk target:bg-signal-wash/40",
        compact ? "py-[7px]" : "py-2",
        className
      )}
    >
      <Checkbox
        checked={task.done}
        onCheckedChange={onToggle}
        onClick={(event) => event.stopPropagation()}
        className="relative z-10 mt-[3px]"
        aria-label={`Toggle ${task.title}`}
      />
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "leading-[1.4] text-pretty transition-colors duration-[120ms]",
            compact ? "text-[13.5px]" : "text-[14px]",
            task.done
              ? "text-muted-foreground line-through decoration-hairline"
              : "text-foreground"
          )}
        >
          {task.title}
        </div>
        {task.note ? (
          <div
            className={cn(
              "mt-[3px] leading-[1.5] text-muted-foreground",
              compact ? "text-[12px]" : "text-[12.5px]"
            )}
          >
            {task.note}
          </div>
        ) : null}
        {task.meta ? (
          <div className="mt-0.5 text-[11.5px] text-faint">{task.meta}</div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-[9px] pt-px">
        {task.estimate ? (
          <span className="text-[11px] text-faint tabular-nums">{task.estimate}</span>
        ) : null}
        {task.due ? (
          <span
            className={cn(
              "rounded-[5px] px-[7px] py-0.5 text-[11.5px] font-semibold whitespace-nowrap",
              PILL_TONES[task.due.tone]
            )}
          >
            {task.due.label}
          </span>
        ) : null}
        {onEdit ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
            aria-label={`Edit ${task.title}`}
            title="Edit task"
            className="grid h-6 w-6 place-items-center rounded-[6px] text-hairline transition-colors duration-[120ms] hover:bg-hover hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/20"
          >
            <Pencil className="h-[13px] w-[13px]" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
