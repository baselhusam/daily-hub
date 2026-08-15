"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { completeTask, deleteTask } from "@/app/actions/tasks";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      <p className="px-3 py-4 text-sm text-muted-foreground">{emptyMessage}</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10" />
          <TableHead>Task</TableHead>
          <TableHead className="w-36">Due date</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TableRow key={task.id}>
            <TableCell>
              <Checkbox
                checked={false}
                disabled={pendingTaskId === task.id}
                onCheckedChange={() => handleComplete(task.id)}
                aria-label={`Complete ${task.title}`}
              />
            </TableCell>
            <TableCell className="font-medium">{task.title}</TableCell>
            <TableCell>
              <span
                className={cn(
                  "text-sm",
                  isOverdue(task.dueDate)
                    ? "text-destructive"
                    : task.dueDate
                      ? "text-foreground"
                      : "text-muted-foreground"
                )}
              >
                {formatDueDate(task.dueDate)}
              </span>
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => deleteTask(task.id)}
                aria-label="Delete task"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
