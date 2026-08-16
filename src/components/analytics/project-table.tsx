"use client";

import type { ProjectAnalytics } from "@/lib/analytics";

export function ProjectTable({ data }: { data: ProjectAnalytics[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No projects yet.</p>;
  }

  return (
    <ul>
      {data.map((project) => (
        <li
          key={project.id}
          className="flex items-baseline justify-between gap-4 border-b border-border/70 py-2.5 last:border-0"
        >
          <div className="min-w-0">
            <p className="truncate text-[15px]">{project.name}</p>
            {project.businessName && (
              <p className="text-sm text-muted-foreground">
                {project.businessName}
              </p>
            )}
          </div>
          <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
            {project.openTasks} open · {project.completedTasks} done ·{" "}
            {project.completionRate}%
          </p>
        </li>
      ))}
    </ul>
  );
}
