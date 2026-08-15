import { z } from "zod";

const logoUrlSchema = z
  .string()
  .refine(
    (value) => value === "" || value.startsWith("/") || value.startsWith("http"),
    "Logo must be a valid path or URL"
  )
  .optional()
  .or(z.literal(""));

const optionalDateSchema = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((value) => (value && value !== "" ? value : undefined));

const weekdaysSchema = z
  .array(z.coerce.number().int().min(0).max(6))
  .min(1, "Select at least one weekday")
  .default([0, 1, 2, 3, 4, 5, 6]);

export const createBusinessSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  iconKey: z.string().min(1).max(40).default("briefcase"),
  logoUrl: logoUrlSchema,
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const createProjectSchema = z.object({
  businessId: z.string().optional().nullable(),
  name: z.string().min(1, "Name is required").max(80),
  description: z.string().max(200).optional(),
  iconKey: z.string().min(1).max(40).default("folder"),
  logoUrl: logoUrlSchema,
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  dueDate: optionalDateSchema,
  status: z.enum(["ACTIVE", "PAUSED", "DONE"]).default("ACTIVE"),
});

export const updateProjectSchema = createProjectSchema.extend({
  id: z.string().min(1),
});

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  notes: z.string().max(500).optional(),
  businessId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  priority: z.coerce.number().int().min(0).max(3).default(0),
  dueDate: optionalDateSchema,
});

export const createDailyTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  iconKey: z.string().min(1).max(40).default("check"),
  logoUrl: logoUrlSchema,
  businessId: z.string().optional().nullable(),
  weekdays: weekdaysSchema,
  isActive: z.coerce.boolean().default(true),
});

export const updateDailyTaskSchema = createDailyTaskSchema.extend({
  id: z.string().min(1),
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

export function parseWeekdaysFromForm(formData: FormData): number[] {
  const raw = formData.getAll("weekdays");
  if (raw.length === 0) {
    return [0, 1, 2, 3, 4, 5, 6];
  }
  return raw.map((value) => Number(value)).filter((value) => value >= 0 && value <= 6);
}
