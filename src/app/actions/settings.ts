"use server";

import { revalidateApp } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { failAction, type ActionResult } from "@/app/actions/types";

const settingsSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(80),
  workspaceName: z.string().trim().min(1, "Workspace name is required").max(80),
  showStreaks: z.coerce.boolean(),
  nudgeDays: z.coerce.number().int().min(2).max(21),
  weekStartsOn: z.coerce.number().int().min(0).max(1),
});

export async function updateSettings(formData: FormData): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse({
    displayName: formData.get("displayName"),
    workspaceName: formData.get("workspaceName"),
    showStreaks: formData.get("showStreaks") === "on" || formData.get("showStreaks") === "true",
    nudgeDays: formData.get("nudgeDays"),
    weekStartsOn: formData.get("weekStartsOn") ?? 1,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    await prisma.settings.upsert({
      where: { id: "default" },
      create: { id: "default", ...parsed.data },
      update: parsed.data,
    });
  } catch (error) {
    return failAction(error, "Failed to save settings.");
  }

  revalidateApp();

  return { success: true };
}
