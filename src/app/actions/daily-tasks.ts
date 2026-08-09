"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getTodayDate } from "@/lib/dates";
import { createDailyTaskSchema } from "@/lib/validations";
import type { ActionResult } from "@/app/actions/businesses";

export async function createDailyTask(
  formData: FormData
): Promise<ActionResult> {
  const businessId = formData.get("businessId");

  const parsed = createDailyTaskSchema.safeParse({
    title: formData.get("title"),
    iconKey: formData.get("iconKey") || "check",
    businessId: businessId === "none" || !businessId ? null : businessId,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { title, iconKey, businessId: resolvedBusinessId } = parsed.data;
  const count = await prisma.dailyTask.count();

  await prisma.dailyTask.create({
    data: {
      title,
      iconKey,
      businessId: resolvedBusinessId ?? null,
      sortOrder: count,
    },
  });

  revalidatePath("/");
  return { success: true };
}

export async function toggleDailyTask(
  dailyTaskId: string
): Promise<ActionResult> {
  const today = getTodayDate();

  const existing = await prisma.completionLog.findFirst({
    where: {
      entityType: "DAILY_TASK",
      entityId: dailyTaskId,
      completedOn: today,
    },
  });

  if (existing) {
    await prisma.completionLog.delete({ where: { id: existing.id } });
  } else {
    await prisma.completionLog.create({
      data: {
        entityType: "DAILY_TASK",
        entityId: dailyTaskId,
        completedOn: today,
      },
    });
  }

  revalidatePath("/");
  return { success: true };
}

export async function deleteDailyTask(id: string): Promise<ActionResult> {
  await prisma.dailyTask.delete({ where: { id } });
  revalidatePath("/");
  return { success: true };
}
