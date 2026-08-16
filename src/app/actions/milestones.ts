"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseDateInput } from "@/lib/dates";
import type { ActionResult } from "@/app/actions/businesses";

const REVALIDATE_PATHS = ["/", "/projects", "/analytics", "/daily"] as const;

function revalidateAll() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

export async function toggleMilestone(id: string): Promise<ActionResult> {
  const milestone = await prisma.milestone.findUnique({ where: { id } });
  if (!milestone) {
    return { success: false, error: "Milestone not found." };
  }

  await prisma.milestone.update({
    where: { id },
    data: { done: !milestone.done },
  });

  revalidateAll();
  return { success: true };
}

export async function deleteMilestone(id: string): Promise<ActionResult> {
  await prisma.milestone.delete({ where: { id } });
  revalidateAll();
  return { success: true };
}

export async function saveProjectMilestones(
  projectId: string,
  milestones: Array<{ id?: string; name: string; dueDate?: string; done?: boolean }>
): Promise<ActionResult> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return { success: false, error: "Project not found." };
  }

  await prisma.milestone.deleteMany({ where: { projectId } });

  const valid = milestones.filter((m) => m.name.trim());
  if (valid.length > 0) {
    await prisma.milestone.createMany({
      data: valid.map((milestone, index) => ({
        projectId,
        name: milestone.name.trim(),
        dueDate: parseDateInput(milestone.dueDate),
        done: milestone.done ?? false,
        sortOrder: index,
      })),
    });
  }

  revalidateAll();
  return { success: true };
}
