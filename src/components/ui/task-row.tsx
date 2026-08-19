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
  done?: boolean;
};

type TaskRowProps = {
  task: TaskRowData;
  pending?: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  className?: string;
};

export function TaskRow({
  task,
  pending,
  onToggle,
  onEdit,
  className,
}: TaskRowProps) {
  return (
    <div
      id={`task-${task.id}`}
      className={cn(
        "group relative flex items-start gap-3 scroll-mt-24 border-b border-rule-soft px-[18px] py-3.5 last:border-0 transition-colors duration-[120ms] hover:bg-canvas-sunk target:bg-signal-wash",
        className
      )}
    >
      <Checkbox
        checked={task.done}
        disabled={pending}
        onCheckedChange={onToggle}
        className="mt-0.5 size-[22px]"
        aria-label={`Toggle ${task.title}`}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <div
            className={cn(
              "text-[14.5px] leading-snug font-medium text-pretty transition-colors duration-[120ms] group-hover:text-foreground",
              task.done && "text-muted-foreground"
            )}
          >
            {task.title}
          </div>
          {task.done && (
            <span className="pointer-events-none absolute top-[9px] left-0 h-[1.5px] w-full max-w-[min(100%,560px)] bg-hairline" />
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
        {task.estimateLabel && (
          <span className="text-[11px] text-faint tabular-nums">
            {task.estimateLabel}
          </span>
        )}
        {task.dueLabel && (
          <span
            className="rounded-[5px] px-[7px] py-[3px] text-[11.5px] font-semibold whitespace-nowrap tabular-nums"
            style={{
              color: task.dueColor,
              backgroundColor: task.dueBg,
            }}
          >
            {task.dueLabel}
          </span>
        )}
        {onEdit && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-hairline opacity-100 hover:text-foreground md:h-7 md:w-7 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            onClick={onEdit}
            aria-label={`Edit ${task.title}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        </div>
      </div>
      {task.done && (
        <span className="pointer-events-none absolute inset-0 bg-white/62 dark:bg-background/50" />
      )}
    </div>
  );
}
