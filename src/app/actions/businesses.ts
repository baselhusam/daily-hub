"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/dates";
import { createBusinessSchema } from "@/lib/validations";

export type ActionResult = {
  success: boolean;
  error?: string;
};

export async function createBusiness(
  formData: FormData
): Promise<ActionResult> {
  const parsed = createBusinessSchema.safeParse({
    name: formData.get("name"),
    iconKey: formData.get("iconKey") || "briefcase",
    logoUrl: formData.get("logoUrl") || undefined,
    color: formData.get("color") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { name, iconKey, logoUrl, color } = parsed.data;
  const slug = slugify(name);

  const existing = await prisma.business.findUnique({ where: { slug } });
  if (existing) {
    return { success: false, error: "A business with this name already exists." };
  }

  const count = await prisma.business.count();

  await prisma.business.create({
    data: {
      name,
      slug,
      iconKey,
      logoUrl: logoUrl || null,
      color: color ?? "#737373",
      sortOrder: count,
    },
  });

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/analytics");
  revalidatePath("/daily");
  return { success: true };
}

export async function deleteBusiness(id: string): Promise<ActionResult> {
  await prisma.business.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/analytics");
  revalidatePath("/daily");
  return { success: true };
}
