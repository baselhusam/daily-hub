"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProjectAnalytics } from "@/lib/analytics";

export function ProjectTable({ data }: { data: ProjectAnalytics[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Project performance</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects yet.</p>
        ) : (
          <div className="space-y-3">
            {data.map((project) => (
              <div
                key={project.id}
                className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{project.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {project.businessName}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline">{project.openTasks} open</Badge>
                  <Badge variant="secondary">{project.completedTasks} done</Badge>
                  <span className="font-medium">{project.completionRate}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
