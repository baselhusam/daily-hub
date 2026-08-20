"use client";

import { Pencil } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TaskRowData = {
  id: string;
  title: string;
  dueLabel?: string;
  dueColor?: string;
  dueBg?: string;
  estimateLabel?: string;
  metaLabel?: string;
  done?: boolean;
};

type TaskRowProps = {
  task: TaskRowData;
  onToggle: () => void;
  onEdit?: () => void;
  className?: string;
};

export function TaskRow({
  task,
  onToggle,
  onEdit,
  className,
}: TaskRowProps) {
  return (
    <div
      id={`task-${task.id}`}
      className={cn(
        "group relative flex items-start gap-2.5 scroll-mt-24 px-4 py-2 transition-colors duration-[120ms] hover:bg-canvas-sunk target:bg-signal-wash",
        className
      )}
    >
      <Checkbox
        checked={task.done}
        onCheckedChange={onToggle}
        className="relative z-10 mt-[3px]"
        aria-label={`Toggle ${task.title}`}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "text-[14px] leading-snug text-pretty transition-colors duration-[120ms]",
              task.done
                ? "text-muted-foreground line-through decoration-hairline"
                : "group-hover:text-foreground"
            )}
          >
            {task.title}
          </div>
          {task.metaLabel ? (
            <div className="mt-0.5 text-[11.5px] text-faint">{task.metaLabel}</div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
        {task.estimateLabel && (
          <span className="text-[11px] text-faint tabular-nums">
            {task.estimateLabel}
          </span>
        )}
        {task.dueLabel && (
          <span
            className="text-[11.5px] font-medium whitespace-nowrap tabular-nums"
            style={{ color: task.dueColor }}
          >
            {task.dueLabel}
          </span>
        )}
        {onEdit && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-hairline opacity-100 hover:text-foreground md:h-6 md:w-6 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            onClick={onEdit}
            aria-label={`Edit ${task.title}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        </div>
      </div>
    </div>
  );
}
