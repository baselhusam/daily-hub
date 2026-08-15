"use client";

import { Trash2, Pencil } from "lucide-react";
import { deleteProject } from "@/app/actions/projects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function ProjectsShell({ projects, businesses }: ProjectsShellProps) {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
            <p className="text-sm text-muted-foreground">
              Define projects with logo, due date, and description.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CreateBusinessDialog />
            <ProjectFormDialog businesses={businesses} />
          </div>
        </header>

        {projects.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">
            No projects yet. Create one to start organizing tasks.
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((project) => (
              <Card key={project.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
                      <EntityIcon
                        iconKey={project.iconKey}
                        logoUrl={project.logoUrl}
                        size={20}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-base">{project.name}</CardTitle>
                      {project.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
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
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{project.status.toLowerCase()}</Badge>
                  <Badge variant="secondary">
                    {project._count.tasks} open tasks
                  </Badge>
                  {project.dueDate && (
                    <Badge variant="outline">
                      Due {formatDueDate(project.dueDate)}
                    </Badge>
                  )}
                  {project.business && (
                    <Badge variant="secondary">{project.business.name}</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
