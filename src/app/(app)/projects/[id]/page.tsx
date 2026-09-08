import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailShell } from "@/components/projects/project-detail-shell";
import { getProjectDetailData } from "@/lib/project-detail";

export const dynamic = "force-dynamic";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getProjectDetailData(id);
  if (!data) return { title: "Project not found" };
  return {
    title: data.project.name,
    description: data.project.description ?? undefined,
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const data = await getProjectDetailData(id);

  if (!data) notFound();

  return <ProjectDetailShell data={data} />;
}
