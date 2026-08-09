"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Check, Trash2 } from "lucide-react";
import { completeTask, deleteTask } from "@/app/actions/tasks";
import { deleteProject } from "@/app/actions/projects";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateTaskDialog } from "./create-task-dialog";
import { EntityIcon } from "./entity-icon";
import type { DashboardBusiness } from "@/lib/dashboard";

type ProjectPanelProps = {
  business?: DashboardBusiness;
};

export function ProjectPanel({ business }: ProjectPanelProps) {
  const [pendingTaskId, setPendingTaskId] = React.useState<string | null>(null);

  if (!business) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        Select a business to view its projects and tasks.
      </Card>
    );
  }

  if (business.projects.length === 0) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        No projects yet. Add one to start tracking work for {business.name}.
      </Card>
    );
  }

  async function handleComplete(taskId: string) {
    setPendingTaskId(taskId);
    await completeTask(taskId);
    setPendingTaskId(null);
  }

  async function handleDeleteTask(taskId: string) {
    await deleteTask(taskId);
  }

  async function handleDeleteProject(projectId: string) {
    await deleteProject(projectId);
  }

  return (
    <div className="space-y-3">
      {business.projects.map((project) => (
        <Card key={project.id} className="p-4">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-background">
                <EntityIcon iconKey={project.iconKey} size={16} />
              </div>
              <div>
                <p className="text-sm font-medium">{project.name}</p>
                {project.description && (
                  <p className="text-xs text-muted-foreground">
                    {project.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <CreateTaskDialog
                businesses={[business]}
                defaultBusinessId={business.id}
                defaultProjectId={project.id}
                triggerLabel="Add task"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDeleteProject(project.id)}
                aria-label="Delete project"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {project.tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No open tasks.</p>
          ) : (
            <ul className="space-y-2">
              {project.tasks.map((task) => (
                <motion.li
                  key={task.id}
                  layout
                  className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    disabled={pendingTaskId === task.id}
                    onClick={() => handleComplete(task.id)}
                    aria-label="Complete task"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <span className="flex-1 text-sm">{task.title}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => handleDeleteTask(task.id)}
                    aria-label="Delete task"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </motion.li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}
