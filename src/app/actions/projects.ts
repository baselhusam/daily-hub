"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseDateInput } from "@/lib/dates";
import {
  createProjectSchema,
  updateProjectSchema,
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

export async function createProject(formData: FormData): Promise<ActionResult> {
  const businessId = parseOptionalBusinessId(formData.get("businessId"));

  const parsed = createProjectSchema.safeParse({
    businessId,
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    iconKey: formData.get("iconKey") || "folder",
    logoUrl: formData.get("logoUrl") || undefined,
    color: formData.get("color") || undefined,
    dueDate: formData.get("dueDate") || undefined,
    status: formData.get("status") || "ACTIVE",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { name, description, iconKey, logoUrl, color, status } = parsed.data;
  const count = await prisma.project.count({
    where: businessId ? { businessId } : { businessId: null },
  });

  await prisma.project.create({
    data: {
      businessId,
      name,
      description: description || null,
      iconKey,
      logoUrl: logoUrl || null,
      color: color || null,
      dueDate: parseDateInput(parsed.data.dueDate),
      status,
      sortOrder: count,
    },
  });

  const created = await prisma.project.findFirst({
    where: { name, businessId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const milestoneNames = formData.getAll("milestoneName");
  const milestoneDueDates = formData.getAll("milestoneDue");

  if (created && milestoneNames.length > 0) {
    const milestones = milestoneNames
      .map((mName, index) => ({
        name: String(mName).trim(),
        dueDate: parseDateInput(String(milestoneDueDates[index] ?? "")),
      }))
      .filter((m) => m.name);

    if (milestones.length > 0) {
      await prisma.milestone.createMany({
        data: milestones.map((milestone, index) => ({
          projectId: created.id,
          name: milestone.name,
          dueDate: milestone.dueDate,
          sortOrder: index,
        })),
      });
    }
  }

  revalidateAll();
  return { success: true };
}

export async function updateProject(formData: FormData): Promise<ActionResult> {
  const businessId = parseOptionalBusinessId(formData.get("businessId"));

  const parsed = updateProjectSchema.safeParse({
    id: formData.get("id"),
    businessId,
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    iconKey: formData.get("iconKey") || "folder",
    logoUrl: formData.get("logoUrl") || undefined,
    color: formData.get("color") || undefined,
    dueDate: formData.get("dueDate") || undefined,
    status: formData.get("status") || "ACTIVE",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { id, name, description, iconKey, logoUrl, color, status } = parsed.data;

  await prisma.project.update({
    where: { id },
    data: {
      businessId,
      name,
      description: description || null,
      iconKey,
      logoUrl: logoUrl || null,
      color: color || null,
      dueDate: parseDateInput(parsed.data.dueDate),
      status,
    },
  });

  const milestoneNames = formData.getAll("milestoneName");
  const milestoneDueDates = formData.getAll("milestoneDue");
  const milestoneDone = formData.getAll("milestoneDone");

  if (milestoneNames.length > 0) {
    await prisma.milestone.deleteMany({ where: { projectId: id } });
    const milestones = milestoneNames
      .map((name, index) => ({
        name: String(name).trim(),
        dueDate: parseDateInput(String(milestoneDueDates[index] ?? "")),
        done: milestoneDone[index] === "on" || milestoneDone[index] === "true",
      }))
      .filter((m) => m.name);

    if (milestones.length > 0) {
      await prisma.milestone.createMany({
        data: milestones.map((milestone, index) => ({
          projectId: id,
          name: milestone.name,
          dueDate: milestone.dueDate,
          done: milestone.done,
          sortOrder: index,
        })),
      });
    }
  }

  revalidateAll();
  return { success: true };
}

export async function deleteProject(id: string): Promise<ActionResult> {
  await prisma.project.delete({ where: { id } });
  revalidateAll();
  return { success: true };
}
