"use server";

import { revalidateApp } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { parseDateInput } from "@/lib/dates";
import { touchProjects } from "@/lib/project-activity";
import { milestoneSchema } from "@/lib/validations";
import { failAction, type ActionResult } from "@/app/actions/types";

function revalidateAll() {
  revalidateApp();
}

export async function toggleMilestone(id: string): Promise<ActionResult> {
  try {
    const milestone = await prisma.milestone.findUnique({ where: { id } });
    if (!milestone) {
      return { success: false, error: "Milestone not found." };
    }

    await prisma.milestone.update({
      where: { id },
      data: { done: !milestone.done },
    });
    await touchProjects([milestone.projectId]);
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update milestone.",
    };
  }

  revalidateAll();
  return { success: true };
}

export async function deleteMilestone(id: string): Promise<ActionResult> {
  try {
    const milestone = await prisma.milestone.delete({
      where: { id },
      select: { projectId: true },
    });
    await touchProjects([milestone.projectId]);
  } catch (error) {
    return failAction(error, "Failed to delete milestone.");
  }

  revalidateAll();
  return { success: true };
}

export async function createMilestone(formData: FormData): Promise<ActionResult> {
  const parsed = milestoneSchema.safeParse({
    name: formData.get("name"),
    dueDate: formData.get("dueDate") || undefined,
  });
  const projectId = String(formData.get("projectId") ?? "").trim();

  if (!projectId) {
    return { success: false, error: "Choose a project." };
  }
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Enter a milestone name.",
    };
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) {
    return { success: false, error: "Project not found." };
  }

  try {
    const last = await prisma.milestone.aggregate({
      where: { projectId },
      _max: { sortOrder: true },
    });

    await prisma.milestone.create({
      data: {
        projectId,
        name: parsed.data.name.trim(),
        dueDate: parseDateInput(parsed.data.dueDate),
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
    await touchProjects([projectId]);
  } catch (error) {
    return failAction(error, "Failed to create milestone.");
  }

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

  try {
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
    await touchProjects([projectId]);
  } catch (error) {
    return failAction(error, "Failed to save milestones.");
  }

  revalidateAll();
  return { success: true };
}
