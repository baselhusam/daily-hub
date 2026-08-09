"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { toggleDailyTask, deleteDailyTask } from "@/app/actions/daily-tasks";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import type { DashboardDailyTask } from "@/lib/dashboard";

type DailyChecklistProps = {
  tasks: DashboardDailyTask[];
};

export function DailyChecklist({ tasks }: DailyChecklistProps) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function handleToggle(taskId: string) {
    setPendingId(taskId);
    await toggleDailyTask(taskId);
    setPendingId(null);
  }

  if (tasks.length === 0) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        Add daily tasks you want to complete every day.
      </Card>
    );
  }

  return (
    <Card className="p-3">
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {tasks.map((task) => (
            <motion.li
              key={task.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2"
            >
              <Checkbox
                checked={task.completedToday}
                disabled={pendingId === task.id}
                onCheckedChange={() => handleToggle(task.id)}
              />
              <span
                className={
                  task.completedToday
                    ? "flex-1 text-sm text-muted-foreground line-through"
                    : "flex-1 text-sm"
                }
              >
                {task.title}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => deleteDailyTask(task.id)}
                aria-label="Delete daily task"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </Card>
  );
}
