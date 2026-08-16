"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { completeTask, deleteTask } from "@/app/actions/tasks";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { formatDueDate, isOverdue } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type TaskTableRow = {
  id: string;
  title: string;
  dueDate: Date | null;
};

type TaskTableProps = {
  tasks: TaskTableRow[];
  emptyMessage?: string;
};

export function TaskTable({
  tasks,
  emptyMessage = "No open tasks.",
}: TaskTableProps) {
  const [pendingTaskId, setPendingTaskId] = React.useState<string | null>(null);

  async function handleComplete(taskId: string) {
    setPendingTaskId(taskId);
    await completeTask(taskId);
    setPendingTaskId(null);
  }

  if (tasks.length === 0) {
    return (
      <p className="py-3 text-sm text-muted-foreground">{emptyMessage}</p>
    );
  }

  return (
    <ul>
      {tasks.map((task) => (
        <li
          key={task.id}
          className="group flex items-center gap-3 border-b border-border/70 py-2.5 last:border-0"
        >
          <Checkbox
            checked={false}
            disabled={pendingTaskId === task.id}
            onCheckedChange={() => handleComplete(task.id)}
            aria-label={`Complete ${task.title}`}
          />
          <span className="min-w-0 flex-1 text-[15px] leading-snug">
            {task.title}
          </span>
          <span
            className={cn(
              "shrink-0 text-sm tabular-nums",
              isOverdue(task.dueDate)
                ? "font-semibold text-destructive"
                : "text-muted-foreground"
            )}
          >
            {task.dueDate ? formatDueDate(task.dueDate) : ""}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:focus-visible:opacity-100"
            onClick={() => deleteTask(task.id)}
            aria-label="Delete task"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
