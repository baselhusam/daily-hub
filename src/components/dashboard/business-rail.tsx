"use client";

import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { cn, formatCount } from "@/lib/utils";
import type { DashboardBusiness } from "@/lib/dashboard";
import { EntityIcon } from "./entity-icon";

type BusinessRailProps = {
  businesses: DashboardBusiness[];
  selectedBusinessId: string | null;
  onSelect: (id: string | null) => void;
  layout?: "vertical" | "horizontal";
};

export function BusinessRail({
  businesses,
  selectedBusinessId,
  onSelect,
  layout = "vertical",
}: BusinessRailProps) {
  if (businesses.length === 0) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        Create your first business to organize projects and tasks.
      </Card>
    );
  }

  return (
    <div
      className={cn(
        layout === "horizontal"
          ? "flex flex-wrap gap-2"
          : "space-y-2"
      )}
    >
      {businesses.map((business) => {
        const openTasks = business.projects.reduce(
          (count, project) => count + project.tasks.length,
          0
        );
        const isSelected = selectedBusinessId === business.id;

        return (
          <motion.button
            key={business.id}
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onSelect(business.id)}
            className={cn(
              "rounded-xl border p-3 text-left transition-colors",
              layout === "horizontal"
                ? "min-w-[200px] flex-1 sm:max-w-xs"
                : "w-full",
              isSelected
                ? "border-foreground/20 bg-accent"
                : "border-border bg-card hover:bg-accent/50"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-background"
                style={{ borderColor: business.color }}
              >
                <EntityIcon
                  iconKey={business.iconKey}
                  logoUrl={business.logoUrl}
                  size={18}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{business.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCount(business.projects.length, "project")} ·{" "}
                  {formatCount(openTasks, "task")}
                </p>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
