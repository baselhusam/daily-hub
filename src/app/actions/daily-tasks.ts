"use server";

import { revalidateApp } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { getTodayDate } from "@/lib/dates";
import {
  createDailyTaskSchema,
  parseWeekdaysFromForm,
  updateDailyTaskSchema,
} from "@/lib/validations";
import { failAction, type ActionResult } from "@/app/actions/types";
import { toWeekdaysJson } from "@/lib/weekdays-db";

function revalidateAll() {
  revalidateApp();
}

export async function createDailyTask(
  formData: FormData
): Promise<ActionResult> {
  const weekdays = parseWeekdaysFromForm(formData);

  const parsed = createDailyTaskSchema.safeParse({
    title: formData.get("title"),
    iconKey: formData.get("iconKey") || "check",
    logoUrl: formData.get("logoUrl") || undefined,
    weekdays,
    isActive: formData.get("isActive") !== "false",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { title, iconKey, logoUrl, isActive } = parsed.data;

  try {
    const { _max } = await prisma.dailyTask.aggregate({ _max: { sortOrder: true } });

    await prisma.dailyTask.create({
      data: {
        title,
        iconKey,
        logoUrl: logoUrl || null,
        weekdays: toWeekdaysJson(parsed.data.weekdays),
        isActive,
        sortOrder: (_max.sortOrder ?? -1) + 1,
      },
    });
  } catch (error) {
    return failAction(error, "Failed to create habit.");
  }

  revalidateAll();
  return { success: true };
}

export async function updateDailyTask(
  formData: FormData
): Promise<ActionResult> {
  const weekdays = parseWeekdaysFromForm(formData);

  const parsed = updateDailyTaskSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    iconKey: formData.get("iconKey") || "check",
    logoUrl: formData.get("logoUrl") || undefined,
    weekdays,
    isActive: formData.get("isActive") !== "false",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { id, title, iconKey, logoUrl, isActive } = parsed.data;

  try {
    await prisma.dailyTask.update({
      where: { id },
      data: {
        title,
        iconKey,
        logoUrl: logoUrl || null,
        weekdays: toWeekdaysJson(parsed.data.weekdays),
        isActive,
      },
    });
  } catch (error) {
    return failAction(error, "Failed to update habit.");
  }

  revalidateAll();
  return { success: true };
}

export async function toggleDailyTask(
  dailyTaskId: string
): Promise<ActionResult> {
  const today = getTodayDate();

  try {
    const where = {
      entityType: "DAILY_TASK" as const,
      entityId: dailyTaskId,
      completedOn: today,
    };
    // deleteMany + upsert rather than findFirst + create: a quick double-click
    // runs two toggles at once, and a second create would hit the unique key.
    const removed = await prisma.completionLog.deleteMany({ where });
    if (removed.count === 0) {
      await prisma.completionLog.upsert({
        where: { entityType_entityId_completedOn: where },
        create: where,
        update: {},
      });
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update habit.",
    };
  }

  revalidateAll();
  return { success: true };
}

export async function deleteDailyTask(id: string): Promise<ActionResult> {
  try {
    await prisma.dailyTask.delete({ where: { id } });
  } catch (error) {
    return failAction(error, "Failed to delete habit.");
  }

  revalidateAll();
  return { success: true };
}
