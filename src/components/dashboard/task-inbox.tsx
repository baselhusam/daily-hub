"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Trash2 } from "lucide-react";
import { completeTask, deleteTask } from "@/app/actions/tasks";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { DashboardTask } from "@/lib/dashboard";

type TaskInboxProps = {
  tasks: DashboardTask[];
};

export function TaskInbox({ tasks }: TaskInboxProps) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function handleComplete(taskId: string) {
    setPendingId(taskId);
    await completeTask(taskId);
    setPendingId(null);
  }

  if (tasks.length === 0) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        No inbox tasks. Add quick tasks that are not tied to a project.
      </Card>
    );
  }

  return (
    <Card className="p-3">
      <ul className="space-y-2">
        {tasks.map((task) => (
          <motion.li
            key={task.id}
            layout
            className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2"
          >
            <Checkbox
              checked={false}
              disabled={pendingId === task.id}
              onCheckedChange={() => handleComplete(task.id)}
              aria-label={`Complete ${task.title}`}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{task.title}</p>
              {(task.business || task.project) && (
                <p className="truncate text-xs text-muted-foreground">
                  {task.business?.name}
                  {task.business && task.project ? " · " : ""}
                  {task.project?.name}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => deleteTask(task.id)}
              aria-label="Delete task"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </motion.li>
        ))}
      </ul>
    </Card>
  );
}
