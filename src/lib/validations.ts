import { z } from "zod";

export const createBusinessSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  iconKey: z.string().min(1).max(40).default("briefcase"),
  logoUrl: z
    .string()
    .refine(
      (value) => value === "" || value.startsWith("/") || value.startsWith("http"),
      "Logo must be a valid path or URL"
    )
    .optional()
    .or(z.literal("")),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const createProjectSchema = z.object({
  businessId: z.string().min(1),
  name: z.string().min(1, "Name is required").max(80),
  description: z.string().max(200).optional(),
  iconKey: z.string().min(1).max(40).default("folder"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  notes: z.string().max(500).optional(),
  businessId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  priority: z.coerce.number().int().min(0).max(3).default(0),
});

export const createDailyTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  iconKey: z.string().min(1).max(40).default("check"),
  businessId: z.string().optional().nullable(),
});

export const toggleDailyTaskSchema = z.object({
  dailyTaskId: z.string().min(1),
});

export const completeTaskSchema = z.object({
  taskId: z.string().min(1),
});

export const deleteEntitySchema = z.object({
  id: z.string().min(1),
});
