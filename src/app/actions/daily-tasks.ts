"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getTodayDate } from "@/lib/dates";
import {
  createDailyTaskSchema,
  parseWeekdaysFromForm,
  updateDailyTaskSchema,
} from "@/lib/validations";
import type { ActionResult } from "@/app/actions/businesses";

const REVALIDATE_PATHS = ["/", "/projects", "/analytics", "/daily"] as const;

function revalidateAll() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

function parseOptionalBusinessId(value: FormDataEntryValue | null): string | null {
  if (!value || value === "none") return null;
  return String(value);
}

export async function createDailyTask(
  formData: FormData
): Promise<ActionResult> {
  const businessId = parseOptionalBusinessId(formData.get("businessId"));
  const weekdays = parseWeekdaysFromForm(formData);

  const parsed = createDailyTaskSchema.safeParse({
    title: formData.get("title"),
    iconKey: formData.get("iconKey") || "check",
    logoUrl: formData.get("logoUrl") || undefined,
    businessId,
    weekdays,
    isActive: formData.get("isActive") !== "false",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { title, iconKey, logoUrl, isActive } = parsed.data;
  const count = await prisma.dailyTask.count();

  await prisma.dailyTask.create({
    data: {
      title,
      iconKey,
      logoUrl: logoUrl || null,
      businessId,
      weekdays: parsed.data.weekdays,
      isActive,
      sortOrder: count,
    },
  });

  revalidateAll();
  return { success: true };
}

export async function updateDailyTask(
  formData: FormData
): Promise<ActionResult> {
  const businessId = parseOptionalBusinessId(formData.get("businessId"));
  const weekdays = parseWeekdaysFromForm(formData);

  const parsed = updateDailyTaskSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    iconKey: formData.get("iconKey") || "check",
    logoUrl: formData.get("logoUrl") || undefined,
    businessId,
    weekdays,
    isActive: formData.get("isActive") !== "false",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { id, title, iconKey, logoUrl, isActive } = parsed.data;

  await prisma.dailyTask.update({
    where: { id },
    data: {
      title,
      iconKey,
      logoUrl: logoUrl || null,
      businessId,
      weekdays: parsed.data.weekdays,
      isActive,
    },
  });

  revalidateAll();
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

  revalidateAll();
  return { success: true };
}

export async function deleteDailyTask(id: string): Promise<ActionResult> {
  await prisma.dailyTask.delete({ where: { id } });
  revalidateAll();
  return { success: true };
}
