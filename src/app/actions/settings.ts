"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { ActionResult } from "@/app/actions/types";

const settingsSchema = z.object({
  displayName: z.string().min(1).max(80),
  role: z.string().min(1).max(80),
  workspaceName: z.string().min(1).max(80),
  showStreaks: z.coerce.boolean(),
  nudgeDays: z.coerce.number().int().min(2).max(21),
});

export async function updateSettings(formData: FormData): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse({
    displayName: formData.get("displayName"),
    role: formData.get("role"),
    workspaceName: formData.get("workspaceName"),
    showStreaks: formData.get("showStreaks") === "on" || formData.get("showStreaks") === "true",
    nudgeDays: formData.get("nudgeDays"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  await prisma.settings.upsert({
    where: { id: "default" },
    create: { id: "default", ...parsed.data },
    update: parsed.data,
  });

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/daily");
  revalidatePath("/analytics");

  return { success: true };
}
