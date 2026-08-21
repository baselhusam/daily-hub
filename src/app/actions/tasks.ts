"use server";

import { revalidateApp } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { getTodayDate, parseDateInput } from "@/lib/dates";
import { createTaskSchema, updateTaskSchema } from "@/lib/validations";
import { failAction, type ActionResult } from "@/app/actions/types";

function revalidateAll() {
  revalidateApp();
}

function parseTaskForm(formData: FormData) {
  const projectId = formData.get("projectId");
  const estimatedRaw = formData.get("estimatedMinutes");

  return {
    title: formData.get("title"),
    notes: formData.get("notes") || undefined,
    projectId: projectId === "none" || !projectId ? null : projectId,
    priority: formData.get("priority") || 0,
    dueDate: formData.get("dueDate") || undefined,
    estimatedMinutes:
      estimatedRaw === "" || estimatedRaw === null
        ? null
        : Number(estimatedRaw),
  };
}

async function assertProjectExists(projectId: string | null) {
  if (!projectId) return;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) {
    throw new Error("Project not found.");
  }
}

export async function createTask(formData: FormData): Promise<ActionResult> {
  const parsed = createTaskSchema.safeParse(parseTaskForm(formData));

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { title, notes, priority, estimatedMinutes } = parsed.data;
  const resolvedProjectId = parsed.data.projectId ?? null;

  try {
    await assertProjectExists(resolvedProjectId);

    await prisma.task.create({
      data: {
        title,
        notes: notes || null,
        projectId: resolvedProjectId,
        priority,
        estimatedMinutes: estimatedMinutes ?? null,
        dueDate: parseDateInput(parsed.data.dueDate),
      },
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create task.",
    };
  }

  revalidateAll();
  return { success: true };
}

export async function updateTask(formData: FormData): Promise<ActionResult> {
  const parsed = updateTaskSchema.safeParse({
    id: formData.get("id"),
    ...parseTaskForm(formData),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { id, title, notes, priority, estimatedMinutes } = parsed.data;
  const resolvedProjectId = parsed.data.projectId ?? null;

  try {
    await assertProjectExists(resolvedProjectId);

    await prisma.task.update({
      where: { id },
      data: {
        title,
        notes: notes || null,
        projectId: resolvedProjectId,
        priority,
        estimatedMinutes: estimatedMinutes ?? null,
        dueDate: parseDateInput(parsed.data.dueDate),
      },
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update task.",
    };
  }

  revalidateAll();
  return { success: true };
}

export async function toggleTask(taskId: string): Promise<ActionResult> {
  const today = getTodayDate();

  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return { success: false, error: "Task not found." };
    }

    if (task.status === "DONE") {
      await prisma.$transaction([
        prisma.task.update({
          where: { id: taskId },
          data: {
            status: "TODO",
            completedAt: null,
          },
        }),
        prisma.completionLog.deleteMany({
          where: {
            entityType: "TASK",
            entityId: taskId,
            completedOn: today,
          },
        }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.task.update({
          where: { id: taskId },
          data: {
            status: "DONE",
            completedAt: new Date(),
          },
        }),
        prisma.completionLog.upsert({
          where: {
            entityType_entityId_completedOn: {
              entityType: "TASK",
              entityId: taskId,
              completedOn: today,
            },
          },
          create: {
            entityType: "TASK",
            entityId: taskId,
            completedOn: today,
            minutes: task.estimatedMinutes,
          },
          update: {
            minutes: task.estimatedMinutes,
          },
        }),
      ]);
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update task.",
    };
  }

  revalidateAll();
  return { success: true };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  try {
    await prisma.task.delete({ where: { id } });
  } catch (error) {
    return failAction(error, "Failed to delete task.");
  }

  revalidateAll();
  return { success: true };
}
