"use client";

import { Trash2, Pencil } from "lucide-react";
import { deleteProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/brand-mark";
import { CreateBusinessDialog } from "@/components/dashboard/create-business-dialog";
import { EntityIcon } from "@/components/dashboard/entity-icon";
import { ProjectFormDialog } from "./project-form-dialog";
import { formatDueDate } from "@/lib/dates";

type ProjectRecord = {
  id: string;
  name: string;
  description: string | null;
  iconKey: string;
  logoUrl: string | null;
  dueDate: Date | null;
  status: "ACTIVE" | "PAUSED" | "DONE";
  businessId: string | null;
  business: { id: string; name: string } | null;
  _count: { tasks: number };
};

type ProjectsShellProps = {
  projects: ProjectRecord[];
  businesses: Array<{ id: string; name: string }>;
};

function statusLabel(status: ProjectRecord["status"]): string {
  if (status === "ACTIVE") return "Active";
  if (status === "PAUSED") return "Paused";
  return "Done";
}

export function ProjectsShell({ projects, businesses }: ProjectsShellProps) {
  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[32px] leading-[1.1] tracking-[-0.04em]">
              Projects
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              The workstreams you return to.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CreateBusinessDialog />
            <ProjectFormDialog businesses={businesses} />
          </div>
        </header>

        {projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Create one to start organizing tasks."
          />
        ) : (
          <ul>
            {projects.map((project) => (
              <li
                key={project.id}
                className="group flex items-start gap-3 border-b border-border/70 py-4 last:border-0"
              >
                <EntityIcon
                  iconKey={project.iconKey}
                  logoUrl={project.logoUrl}
                  size={20}
                  className="mt-0.5 shrink-0 text-muted-foreground"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium leading-snug">
                    {project.name}
                  </p>
                  {project.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {project.description}
                    </p>
                  )}
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {project._count.tasks} open
                    {project.dueDate
                      ? ` · due ${formatDueDate(project.dueDate)}`
                      : ""}
                    {` · ${statusLabel(project.status)}`}
                    {project.business ? ` · ${project.business.name}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:focus-within:opacity-100">
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
                    }}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">Edit project</span>
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => deleteProject(project.id)}
                    aria-label="Delete project"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
