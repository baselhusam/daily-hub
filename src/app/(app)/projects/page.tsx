import { ProjectsShell } from "@/components/projects/projects-shell";
import { getProjectsPageData } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const { projects, todayISO, nudgeDays } = await getProjectsPageData();

  return <ProjectsShell projects={projects} todayISO={todayISO} nudgeDays={nudgeDays} />;
}
