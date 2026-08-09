"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createProjectSchema } from "@/lib/validations";
import type { ActionResult } from "@/app/actions/businesses";

export async function createProject(formData: FormData): Promise<ActionResult> {
  const parsed = createProjectSchema.safeParse({
    businessId: formData.get("businessId"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    iconKey: formData.get("iconKey") || "folder",
    color: formData.get("color") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { businessId, name, description, iconKey, color } = parsed.data;
  const count = await prisma.project.count({ where: { businessId } });

  await prisma.project.create({
    data: {
      businessId,
      name,
      description: description || null,
      iconKey,
      color: color || null,
      sortOrder: count,
    },
  });

  revalidatePath("/");
  return { success: true };
}

export async function deleteProject(id: string): Promise<ActionResult> {
  await prisma.project.delete({ where: { id } });
  revalidatePath("/");
  return { success: true };
}
