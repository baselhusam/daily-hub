"use client";

import * as React from "react";
import { format } from "date-fns";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DashboardData } from "@/lib/dashboard";
import { BusinessRail } from "./business-rail";
import { ProjectPanel } from "./project-panel";
import { DailyChecklist } from "./daily-checklist";
import { TaskInbox } from "./task-inbox";
import { CompletionFeed } from "./completion-feed";
import { CreateBusinessDialog } from "./create-business-dialog";
import { CreateProjectDialog } from "./create-project-dialog";
import { CreateTaskDialog } from "./create-task-dialog";
import { CreateDailyTaskDialog } from "./create-daily-task-dialog";

export function DashboardShell({ data }: { data: DashboardData }) {
  const [selectedBusinessId, setSelectedBusinessId] = React.useState<string | null>(
    data.businesses[0]?.id ?? null
  );

  const selectedBusiness = data.businesses.find(
    (business) => business.id === selectedBusinessId
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">DailyHub</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "EEEE, MMMM d")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{data.stats.openTasks} open tasks</Badge>
            <Badge variant="secondary">
              {data.stats.dailyCompleted}/{data.stats.dailyTotal} daily done
            </Badge>
            <ThemeToggle />
          </div>
        </motion.header>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.06 },
            },
          }}
          className="grid grid-cols-1 gap-4 lg:grid-cols-12"
        >
          <motion.section
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
            className="lg:col-span-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium">Businesses</h2>
              <CreateBusinessDialog />
            </div>
            <BusinessRail
              businesses={data.businesses}
              selectedBusinessId={selectedBusinessId}
              onSelect={setSelectedBusinessId}
            />
          </motion.section>

          <motion.section
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
            className="lg:col-span-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium">
                {selectedBusiness ? selectedBusiness.name : "Projects"}
              </h2>
              {selectedBusiness && (
                <CreateProjectDialog businessId={selectedBusiness.id} />
              )}
            </div>
            <ProjectPanel business={selectedBusiness} />
          </motion.section>

          <motion.section
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
            className="lg:col-span-4 space-y-4"
          >
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium">Daily checklist</h2>
                <CreateDailyTaskDialog businesses={data.businesses} />
              </div>
              <DailyChecklist tasks={data.dailyTasks} />
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium">Inbox</h2>
                <CreateTaskDialog businesses={data.businesses} />
              </div>
              <TaskInbox tasks={data.inboxTasks} />
            </div>
          </motion.section>

          <motion.section
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
            className="lg:col-span-12"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium">Recent completions</h2>
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Logged automatically
              </Button>
            </div>
            <CompletionFeed completions={data.completions} />
          </motion.section>
        </motion.div>
      </div>
    </div>
  );
}
