"use server";

import { revalidateApp } from "@/lib/revalidate";
import { prisma } from "@/lib/prisma";
import { parseDateInput } from "@/lib/dates";
import {
  createProjectSchema,
  milestoneSchema,
  updateProjectSchema,
} from "@/lib/validations";
import type { ActionResult } from "@/app/actions/types";

function revalidateAll() {
  revalidateApp();
}

function parseMilestonesFromForm(formData: FormData) {
  const names = formData.getAll("milestoneName");
  const dueDates = formData.getAll("milestoneDue");
  const doneFlags = formData.getAll("milestoneDone");
  const milestones: Array<{
    name: string;
    dueDate: Date | null;
    done: boolean;
  }> = [];

  for (let index = 0; index < names.length; index++) {
    const name = String(names[index] ?? "").trim();
    if (!name) continue;

    const parsed = milestoneSchema.safeParse({
      name,
      dueDate: dueDates[index] ? String(dueDates[index]) : undefined,
      done: doneFlags[index] === "on" || doneFlags[index] === "true",
    });

    if (!parsed.success) {
      return {
        error:
          parsed.error.issues[0]?.message ??
          "Enter a valid date with a 4-digit year",
      };
    }

    milestones.push({
      name: parsed.data.name,
      dueDate: parseDateInput(parsed.data.dueDate),
      done: parsed.data.done ?? false,
    });
  }

  return { milestones };
}

export async function createProject(formData: FormData): Promise<ActionResult> {
  const parsed = createProjectSchema.safeParse({
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

  const milestonesParsed = parseMilestonesFromForm(formData);
  if ("error" in milestonesParsed) {
    return { success: false, error: milestonesParsed.error };
  }

  const { name, description, iconKey, logoUrl, color, status } = parsed.data;

  try {
    const count = await prisma.project.count();

    const created = await prisma.project.create({
      data: {
        name,
        description: description || null,
        iconKey,
        logoUrl: logoUrl || null,
        color: color || null,
        dueDate: parseDateInput(parsed.data.dueDate),
        status,
        sortOrder: count,
      },
      select: { id: true },
    });

    if (milestonesParsed.milestones.length > 0) {
      await prisma.milestone.createMany({
        data: milestonesParsed.milestones.map((milestone, index) => ({
          projectId: created.id,
          name: milestone.name,
          dueDate: milestone.dueDate,
          sortOrder: index,
        })),
      });
    }
  } catch {
    return { success: false, error: "Failed to create project." };
  }

  revalidateAll();
  return { success: true };
}

export async function updateProject(formData: FormData): Promise<ActionResult> {
  const parsed = updateProjectSchema.safeParse({
    id: formData.get("id"),
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

  const milestonesParsed = parseMilestonesFromForm(formData);
  if ("error" in milestonesParsed) {
    return { success: false, error: milestonesParsed.error };
  }

  const { id, name, description, iconKey, logoUrl, color, status } = parsed.data;
  const hasMilestoneFields = formData.getAll("milestoneName").length > 0;

  try {
    await prisma.project.update({
      where: { id },
      data: {
        name,
        description: description || null,
        iconKey,
        logoUrl: logoUrl || null,
        color: color || null,
        dueDate: parseDateInput(parsed.data.dueDate),
        status,
      },
    });

    if (hasMilestoneFields) {
      await prisma.milestone.deleteMany({ where: { projectId: id } });
      if (milestonesParsed.milestones.length > 0) {
        await prisma.milestone.createMany({
          data: milestonesParsed.milestones.map((milestone, index) => ({
            projectId: id,
            name: milestone.name,
            dueDate: milestone.dueDate,
            done: milestone.done,
            sortOrder: index,
          })),
        });
      }
    }
  } catch {
    return { success: false, error: "Failed to save project." };
  }

  revalidateAll();
  return { success: true };
}

export async function deleteProject(id: string): Promise<ActionResult> {
  await prisma.project.delete({ where: { id } });
  revalidateAll();
  return { success: true };
}
