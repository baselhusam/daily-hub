"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getTodayDate } from "@/lib/dates";
import { createTaskSchema } from "@/lib/validations";
import type { ActionResult } from "@/app/actions/businesses";

export async function createTask(formData: FormData): Promise<ActionResult> {
  const businessId = formData.get("businessId");
  const projectId = formData.get("projectId");

  const parsed = createTaskSchema.safeParse({
    title: formData.get("title"),
    notes: formData.get("notes") || undefined,
    businessId: businessId === "none" || !businessId ? null : businessId,
    projectId: projectId === "none" || !projectId ? null : projectId,
    priority: formData.get("priority") || 0,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { title, notes, priority } = parsed.data;
  const resolvedBusinessId = parsed.data.businessId ?? null;
  const resolvedProjectId = parsed.data.projectId ?? null;

  if (resolvedProjectId) {
    const project = await prisma.project.findUnique({
      where: { id: resolvedProjectId },
      select: { businessId: true },
    });
    if (!project) {
      return { success: false, error: "Project not found." };
    }
  }

  await prisma.task.create({
    data: {
      title,
      notes: notes || null,
      businessId: resolvedBusinessId,
      projectId: resolvedProjectId,
      priority,
    },
  });

  revalidatePath("/");
  return { success: true };
}

export async function completeTask(taskId: string): Promise<ActionResult> {
  const today = getTodayDate();

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return { success: false, error: "Task not found." };
  }

  if (task.status === "DONE") {
    return { success: true };
  }

  await prisma.$transaction([
    prisma.task.update({
      where: { id: taskId },
      data: {
        status: "DONE",
        completedAt: new Date(),
      },
    }),
    prisma.completionLog.create({
      data: {
        entityType: "TASK",
        entityId: taskId,
        completedOn: today,
      },
    }),
  ]);

  revalidatePath("/");
  return { success: true };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  await prisma.task.delete({ where: { id } });
  revalidatePath("/");
  return { success: true };
}
