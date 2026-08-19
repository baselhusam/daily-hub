"use server";

import { revalidateApp } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { parseDateInput } from "@/lib/dates";
import { milestoneSchema } from "@/lib/validations";
import type { ActionResult } from "@/app/actions/types";

function revalidateAll() {
  revalidateApp();
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

  const valid: Array<{ name: string; dueDate: Date | null; done: boolean }> = [];
  for (const milestone of milestones) {
    if (!milestone.name.trim()) continue;
    const parsed = milestoneSchema.safeParse(milestone);
    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Enter a valid date with a 4-digit year",
      };
    }
    valid.push({
      name: parsed.data.name.trim(),
      dueDate: parseDateInput(parsed.data.dueDate),
      done: parsed.data.done ?? false,
    });
  }

  await prisma.milestone.deleteMany({ where: { projectId } });

  if (valid.length > 0) {
    await prisma.milestone.createMany({
      data: valid.map((milestone, index) => ({
        projectId,
        name: milestone.name,
        dueDate: milestone.dueDate,
        done: milestone.done,
        sortOrder: index,
      })),
    });
  }

  revalidateAll();
  return { success: true };
}
