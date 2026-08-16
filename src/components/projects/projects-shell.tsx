"use client";

import { Pencil, Trash2 } from "lucide-react";
import { deleteProject } from "@/app/actions/projects";
import { toggleMilestone } from "@/app/actions/milestones";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/brand-mark";
import { CreateBusinessDialog } from "@/components/dashboard/create-business-dialog";
import { ProjectFormDialog } from "./project-form-dialog";
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
  businessId: string | null;
  business: { id: string; name: string } | null;
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

type BusinessRecord = {
  id: string;
  name: string;
  iconKey: string;
  logoUrl: string | null;
  color: string;
  _count: { projects: number };
};

type ProjectsShellProps = {
  projects: ProjectRecord[];
  businesses: BusinessRecord[];
};

export function ProjectsShell({ projects, businesses }: ProjectsShellProps) {
  const today = getTodayDate();

  return (
    <div className="page-gutter animate-dh-fade py-[clamp(18px,2.6vw,32px)] pb-28">
      <div className="mx-auto flex max-w-[1080px] flex-col gap-5">
        <PageHeader
          eyebrow="Workstreams"
          title="Projects"
          description="What each one still needs, and when it's due."
          actions={
            <>
              <CreateBusinessDialog />
              <ProjectFormDialog businesses={businesses} />
            </>
          }
        />

        {businesses.length > 0 && (
          <section className="flex flex-col gap-2">
            <p className="px-0.5 text-[11.5px] font-semibold tracking-[0.02em] text-faint">
              Businesses
            </p>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
              {businesses.map((business) => (
                <div
                  key={business.id}
                  className="flex items-center gap-3 rounded-[10px] border border-border bg-card px-[15px] py-3.5"
                >
                  <EntityAvatar
                    name={business.name}
                    color={business.color}
                    logoUrl={business.logoUrl}
                    size={34}
                    rounded="lg"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-semibold">
                      {business.name}
                    </div>
                    <div className="mt-0.5 truncate text-[12px] text-faint">
                      {business._count.projects} project
                      {business._count.projects === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

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
                <SurfaceCard key={project.id} className="p-[18px]">
                  <div className="flex flex-col gap-3.5">
                    <div className="flex items-start gap-3">
                      <EntityAvatar
                        name={project.name}
                        color={project.color}
                        logoUrl={project.logoUrl}
                        size={38}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[16.5px] font-semibold tracking-[-0.01em]">
                            {project.name}
                          </span>
                          {project.business && (
                            <Badge variant="muted" className="rounded px-1.5 py-0.5 text-[11.5px]">
                              {project.business.name}
                            </Badge>
                          )}
                        </div>
                        {project.description && (
                          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground text-pretty">
                            {project.description}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-0.5">
                        <ProjectFormDialog
                          businesses={businesses}
                          project={{
                            id: project.id,
                            name: project.name,
                            description: project.description,
                            iconKey: project.iconKey,
                            logoUrl: project.logoUrl,
                            dueDate: project.dueDate,
                            status: project.status,
                            businessId: project.businessId,
                            milestones: project.milestones,
                          }}
                          trigger={
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#C7C6C2]">
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit project</span>
                            </Button>
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[#C7C6C2] hover:text-destructive"
                          onClick={() => deleteProject(project.id)}
                          aria-label="Delete project"
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
                          style={{ color: project.color ?? "#37352F" }}
                        >
                          {project.completionPct}%
                        </span>
                      </div>
                      <ProgressBar
                        value={project.completionPct}
                        color={project.color ?? "#37352F"}
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
                              key={milestone.id}
                              className="flex items-center gap-2.5"
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
                                    ? "#9B9A97"
                                    : "#37352F",
                                }}
                              >
                                {milestone.name}
                              </span>
                              {md !== null && (
                                <span
                                  className="text-[11px] whitespace-nowrap tabular-nums"
                                  style={{
                                    color: md < 0 ? "#C4554D" : "#9B9A97",
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
                        <span className="text-[12.5px] font-medium text-[#9E5B12]">
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
    </div>
  );
}
