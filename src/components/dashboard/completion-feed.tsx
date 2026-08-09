"use client";

import { formatDistanceToNow } from "date-fns";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { EntityIcon } from "./entity-icon";
import type { DashboardCompletion } from "@/lib/dashboard";

type CompletionFeedProps = {
  completions: DashboardCompletion[];
};

export function CompletionFeed({ completions }: CompletionFeedProps) {
  if (completions.length === 0) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        Completed tasks will appear here.
      </Card>
    );
  }

  return (
    <Card className="p-3">
      <ul className="space-y-2">
        {completions.map((item, index) => (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2"
          >
            <EntityIcon iconKey={item.iconKey} size={16} className="text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{item.title}</p>
              <p className="text-xs text-muted-foreground">
                {item.entityType === "DAILY_TASK" ? "Daily task" : "Task"} ·{" "}
                {formatDistanceToNow(item.completedAt, { addSuffix: true })}
              </p>
            </div>
          </motion.li>
        ))}
      </ul>
    </Card>
  );
}
