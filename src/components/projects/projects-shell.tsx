"use client";

import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toggleMilestone } from "@/app/actions/milestones";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/brand-mark";
import { ProjectFormDialog } from "./project-form-dialog";
import {
  DeleteProjectDialog,
  type DeleteProjectTarget,
} from "./delete-project-dialog";
import { formatDueDate } from "@/lib/dates";
import { daysUntil } from "@/lib/streak";
import { getDeadlineColor } from "@/lib/due-meta";
import { getTodayDate } from "@/lib/dates";

type ProjectRecord = {
  id: string;
  name: string;
  description: string | null;
  iconKey: string;
  logoUrl: string | null;
  color: string | null;
  dueDate: Date | null;
  status: "ACTIVE" | "PAUSED" | "DONE";
  milestones: Array<{
    id: string;
    name: string;
    dueDate: Date | null;
    done: boolean;
  }>;
  openCount: number;
  doneCount: number;
  completionPct: number;
  stalled: boolean;
  idleDays: number;
};

type ProjectsShellProps = {
  projects: ProjectRecord[];
};

export function ProjectsShell({ projects }: ProjectsShellProps) {
  const today = getTodayDate();
  const [pendingDelete, setPendingDelete] =
    React.useState<DeleteProjectTarget | null>(null);

  React.useEffect(() => {
    const id = window.location.hash.replace("#", "");
    if (!id) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="page-gutter animate-dh-fade py-[clamp(18px,2.6vw,32px)] pb-28">
      <div className="mx-auto flex max-w-[1080px] flex-col gap-5">
        <PageHeader
          eyebrow="Workstreams"
          title="Projects"
          description="What each one still needs, and when it's due."
          actions={<ProjectFormDialog />}
        />

        {projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Create one to start organizing tasks."
          />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-3.5">
            {projects.map((project) => {
              const dl = daysUntil(project.dueDate, today);
              return (
                <SurfaceCard
                  key={project.id}
                  id={`project-${project.id}`}
                  className="scroll-mt-24 p-[18px] target:bg-signal-wash"
                >
                  <div className="flex flex-col gap-3.5">
                    <div className="flex items-start gap-3">
                      <EntityAvatar
                        name={project.name}
                        color={project.color}
                        logoUrl={project.logoUrl}
                        iconKey={project.iconKey}
                        size={38}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-[16.5px] font-semibold tracking-[-0.01em]">
                          {project.name}
                        </span>
                        {project.description && (
                          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground text-pretty">
                            {project.description}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-0.5">
                        <ProjectFormDialog
                          project={{
                            id: project.id,
                            name: project.name,
                            description: project.description,
                            iconKey: project.iconKey,
                            logoUrl: project.logoUrl,
                            dueDate: project.dueDate,
                            status: project.status,
                            milestones: project.milestones,
                          }}
                          trigger={
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-hairline">
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit project</span>
                            </Button>
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-hairline hover:bg-destructive-wash hover:text-destructive"
                          onClick={() =>
                            setPendingDelete({
                              id: project.id,
                              name: project.name,
                              logoUrl: project.logoUrl,
                              iconKey: project.iconKey,
                              color: project.color,
                              openCount: project.openCount,
                              milestoneCount: project.milestones.length,
                            })
                          }
                          aria-label={`Delete ${project.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[12px] text-muted-foreground">
                          <b className="text-[13px] text-foreground tabular-nums">
                            {project.openCount}
                          </b>{" "}
                          still open · {project.doneCount} done
                        </span>
                        <span
                          className="text-[12px] font-semibold tabular-nums"
                          style={{ color: project.color ?? "var(--foreground)" }}
                        >
                          {project.completionPct}%
                        </span>
                      </div>
                      <ProgressBar
                        value={project.completionPct}
                        color={project.color ?? "var(--foreground)"}
                        height="md"
                      />
                    </div>

                    <div className="flex flex-col gap-2 border-t border-rule-soft pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11.5px] font-semibold tracking-[0.02em] text-faint">
                          Milestones
                        </span>
                        {dl !== null && (
                          <span
                            className="text-[11.5px] font-semibold tabular-nums"
                            style={{ color: getDeadlineColor(dl) }}
                          >
                            Ships {formatDueDate(project.dueDate)} ·{" "}
                            {dl < 0 ? `${Math.abs(dl)}d late` : `${dl}d`}
                          </span>
                        )}
                      </div>
                      {project.milestones.length === 0 ? (
                        <p className="text-[12.5px] text-faint">No milestones yet.</p>
                      ) : (
                        project.milestones.map((milestone) => {
                          const md = daysUntil(milestone.dueDate, today);
                          return (
                            <div
                              id={`milestone-${milestone.id}`}
                              key={milestone.id}
                              className="flex scroll-mt-24 items-center gap-2.5 rounded-md px-1 py-0.5 -mx-1 target:bg-signal-wash"
                            >
                              <Checkbox
                                checked={milestone.done}
                                onCheckedChange={() =>
                                  toggleMilestone(milestone.id)
                                }
                                className="size-[17px]"
                                aria-label={`Toggle ${milestone.name}`}
                              />
                              <span
                                className="min-w-0 flex-1 truncate text-[13.5px] font-medium"
                                style={{
                                  color: milestone.done
                                    ? "var(--muted-foreground)"
                                    : "var(--foreground)",
                                }}
                              >
                                {milestone.name}
                              </span>
                              {md !== null && (
                                <span
                                  className="text-[11px] whitespace-nowrap tabular-nums"
                                  style={{
                                    color: md < 0 ? "var(--destructive)" : "var(--faint)",
                                  }}
                                >
                                  {md < 0
                                    ? `${Math.abs(md)}d late`
                                    : md === 0
                                      ? "Today"
                                      : `${md}d`}
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {project.stalled && (
                      <div className="flex items-center gap-2 rounded-[10px] border border-warn-border bg-warn-wash px-3 py-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-warn" />
                        <span className="text-[12.5px] font-medium text-warn">
                          {project.idleDays >= 99
                            ? "Never logged activity"
                            : `No activity for ${project.idleDays} days`}{" "}
                          · {project.openCount} open
                        </span>
                      </div>
                    )}
                  </div>
                </SurfaceCard>
              );
            })}
          </div>
        )}
      </div>
      <DeleteProjectDialog
        project={pendingDelete}
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      />
    </div>
  );
}
