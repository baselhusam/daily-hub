import "server-only";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAnalyticsData } from "@/lib/analytics";
import { getTodayDate, parseDateInput } from "@/lib/dates";
import { prisma, ensureDatabaseReady } from "@/lib/prisma";
import { touchProjects } from "@/lib/project-activity";
import { revalidateApp } from "@/lib/revalidate";
import { toWeekdaysJson, withParsedWeekdays } from "@/lib/weekdays-db";

const dateInput = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date in YYYY-MM-DD format");

const nullableDateInput = dateInput.nullable();
const projectStatus = z.enum(["ACTIVE", "PAUSED", "DONE"]);
const taskStatus = z.enum(["TODO", "DOING", "DONE"]);

function result(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function parseOptionalDate(value: string | null | undefined) {
  if (value === undefined) return undefined;
  return value === null ? null : parseDateInput(value);
}

async function assertProjectExists(projectId: string | null | undefined) {
  if (!projectId) return;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) throw new Error(`Project ${projectId} was not found.`);
}

async function listTasks(projectId?: string | null) {
  await ensureDatabaseReady();
  return prisma.task.findMany({
    where: projectId === undefined ? undefined : { projectId },
    include: { project: { select: { id: true, name: true } } },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });
}

async function setTaskCompletion(taskId: string, completed: boolean, date?: string) {
  await ensureDatabaseReady();
  const completedOn = date ? parseDateInput(date) : getTodayDate();
  if (!completedOn) throw new Error("Use a date in YYYY-MM-DD format.");

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error(`Task ${taskId} was not found.`);

  if (completed) {
    await prisma.$transaction([
      prisma.task.update({
        where: { id: taskId },
        data: { status: "DONE", completedAt: new Date() },
      }),
      prisma.completionLog.upsert({
        where: {
          entityType_entityId_completedOn: {
            entityType: "TASK",
            entityId: taskId,
            completedOn,
          },
        },
        create: {
          entityType: "TASK",
          entityId: taskId,
          completedOn,
          minutes: task.estimatedMinutes,
        },
        update: { minutes: task.estimatedMinutes },
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.task.update({
        where: { id: taskId },
        data: { status: "TODO", completedAt: null },
      }),
      prisma.completionLog.deleteMany({
        where: { entityType: "TASK", entityId: taskId, completedOn },
      }),
    ]);
  }

  await touchProjects([task.projectId]);
  revalidateApp();
  return prisma.task.findUnique({ where: { id: taskId } });
}

async function setHabitCompletion(habitId: string, completed: boolean, date?: string) {
  await ensureDatabaseReady();
  const completedOn = date ? parseDateInput(date) : getTodayDate();
  if (!completedOn) throw new Error("Use a date in YYYY-MM-DD format.");

  const habit = await prisma.dailyTask.findUnique({ where: { id: habitId } });
  if (!habit) throw new Error(`Habit ${habitId} was not found.`);

  if (completed) {
    await prisma.completionLog.upsert({
      where: {
        entityType_entityId_completedOn: {
          entityType: "DAILY_TASK",
          entityId: habitId,
          completedOn,
        },
      },
      create: { entityType: "DAILY_TASK", entityId: habitId, completedOn },
      update: {},
    });
  } else {
    await prisma.completionLog.deleteMany({
      where: { entityType: "DAILY_TASK", entityId: habitId, completedOn },
    });
  }

  revalidateApp();
  return habit;
}

/** Creates the complete tool set for the local DailyHub MCP endpoint. */
export function createDailyHubMcpServer() {
  const server = new McpServer({
    name: "daily-hub",
    version: process.env.npm_package_version ?? "0.1.9",
  });

  server.registerTool(
    "list_projects",
    {
      title: "List projects",
      description: "List all DailyHub projects, including task counts and milestones.",
      annotations: { readOnlyHint: true },
    },
    async () => {
      await ensureDatabaseReady();
      const projects = await prisma.project.findMany({
        include: {
          milestones: { orderBy: { sortOrder: "asc" } },
          _count: { select: { tasks: true } },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      return result(projects);
    }
  );

  server.registerTool(
    "list_tasks",
    {
      title: "List tasks",
      description: "List tasks. Pass projectId to filter to one project; omit it to list all tasks.",
      inputSchema: { projectId: z.string().min(1).optional() },
      annotations: { readOnlyHint: true },
    },
    async ({ projectId }) => result(await listTasks(projectId))
  );

  server.registerTool(
    "list_inbox",
    {
      title: "List inbox",
      description: "List unassigned tasks. DailyHub stores inbox items as tasks without a project.",
      annotations: { readOnlyHint: true },
    },
    async () => result(await listTasks(null))
  );

  server.registerTool(
    "list_habits",
    {
      title: "List habits",
      description: "List DailyHub habits, including each habit's scheduled weekdays and completion state today.",
      annotations: { readOnlyHint: true },
    },
    async () => {
      await ensureDatabaseReady();
      const today = getTodayDate();
      const [habits, completed] = await Promise.all([
        prisma.dailyTask.findMany({ orderBy: { sortOrder: "asc" } }),
        prisma.completionLog.findMany({
          where: { entityType: "DAILY_TASK", completedOn: today },
          select: { entityId: true },
        }),
      ]);
      const completedIds = new Set(completed.map((entry) => entry.entityId));
      return result(
        habits.map((habit) => ({
          ...withParsedWeekdays(habit),
          completedToday: completedIds.has(habit.id),
        }))
      );
    }
  );

  server.registerTool(
    "create_project",
    {
      title: "Create project",
      description: "Create a project. Dates must be YYYY-MM-DD.",
      inputSchema: {
        name: z.string().min(1).max(80),
        description: z.string().max(200).optional(),
        dueDate: dateInput.optional(),
        status: projectStatus.optional(),
        iconKey: z.string().min(1).max(40).optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      },
    },
    async ({ name, description, dueDate, status, iconKey, color }) => {
      await ensureDatabaseReady();
      const sortOrder = await prisma.project.count();
      const project = await prisma.project.create({
        data: {
          name,
          description: description ?? null,
          dueDate: dueDate ? parseDateInput(dueDate) : null,
          status: status ?? "ACTIVE",
          iconKey: iconKey ?? "folder",
          color: color ?? null,
          sortOrder,
        },
      });
      revalidateApp();
      return result(project);
    }
  );

  server.registerTool(
    "update_project",
    {
      title: "Update project",
      description: "Update only the supplied project fields. Set dueDate to null to clear it.",
      inputSchema: {
        id: z.string().min(1),
        name: z.string().min(1).max(80).optional(),
        description: z.string().max(200).nullable().optional(),
        dueDate: nullableDateInput.optional(),
        status: projectStatus.optional(),
        iconKey: z.string().min(1).max(40).optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
      },
    },
    async ({ id, dueDate, ...input }) => {
      await ensureDatabaseReady();
      const project = await prisma.project.update({
        where: { id },
        data: { ...input, ...(dueDate !== undefined ? { dueDate: parseOptionalDate(dueDate) } : {}) },
      });
      revalidateApp();
      return result(project);
    }
  );

  server.registerTool(
    "create_task",
    {
      title: "Create task",
      description: "Create a task. Omit projectId to create an inbox item. Dates must be YYYY-MM-DD.",
      inputSchema: {
        title: z.string().min(1).max(200),
        projectId: z.string().min(1).nullable().optional(),
        notes: z.string().max(500).optional(),
        dueDate: dateInput.optional(),
        priority: z.number().int().min(0).max(3).optional(),
        estimatedMinutes: z.number().int().min(0).max(999).optional(),
      },
    },
    async ({ title, projectId, notes, dueDate, priority, estimatedMinutes }) => {
      await ensureDatabaseReady();
      await assertProjectExists(projectId);
      const task = await prisma.task.create({
        data: {
          title,
          projectId: projectId ?? null,
          notes: notes ?? null,
          dueDate: dueDate ? parseDateInput(dueDate) : null,
          priority: priority ?? 0,
          estimatedMinutes: estimatedMinutes ?? null,
        },
      });
      await touchProjects([task.projectId]);
      revalidateApp();
      return result(task);
    }
  );

  server.registerTool(
    "create_inbox_item",
    {
      title: "Create inbox item",
      description: "Create an unassigned task in the DailyHub inbox.",
      inputSchema: {
        title: z.string().min(1).max(200),
        notes: z.string().max(500).optional(),
        dueDate: dateInput.optional(),
        priority: z.number().int().min(0).max(3).optional(),
        estimatedMinutes: z.number().int().min(0).max(999).optional(),
      },
    },
    async ({ title, notes, dueDate, priority, estimatedMinutes }) => {
      await ensureDatabaseReady();
      const task = await prisma.task.create({
        data: {
          title,
          notes: notes ?? null,
          dueDate: dueDate ? parseDateInput(dueDate) : null,
          priority: priority ?? 0,
          estimatedMinutes: estimatedMinutes ?? null,
        },
      });
      revalidateApp();
      return result(task);
    }
  );

  server.registerTool(
    "update_task",
    {
      title: "Update task",
      description: "Update only the supplied task fields. Set projectId to null to move it to the inbox, or dueDate to null to clear it.",
      inputSchema: {
        id: z.string().min(1),
        title: z.string().min(1).max(200).optional(),
        projectId: z.string().min(1).nullable().optional(),
        notes: z.string().max(500).nullable().optional(),
        dueDate: nullableDateInput.optional(),
        priority: z.number().int().min(0).max(3).optional(),
        estimatedMinutes: z.number().int().min(0).max(999).nullable().optional(),
        status: taskStatus.optional(),
      },
    },
    async ({ id, projectId, dueDate, ...input }) => {
      await ensureDatabaseReady();
      await assertProjectExists(projectId);
      const existing = await prisma.task.findUnique({ where: { id }, select: { projectId: true } });
      const task = await prisma.task.update({
        where: { id },
        data: {
          ...input,
          ...(projectId !== undefined ? { projectId } : {}),
          ...(dueDate !== undefined ? { dueDate: parseOptionalDate(dueDate) } : {}),
        },
      });
      await touchProjects([existing?.projectId, task.projectId]);
      revalidateApp();
      return result(task);
    }
  );

  server.registerTool(
    "set_task_completion",
    {
      title: "Set task completion",
      description: "Mark a task complete or incomplete, and maintain its completion history. Defaults to today; date must be YYYY-MM-DD.",
      inputSchema: { id: z.string().min(1), completed: z.boolean(), date: dateInput.optional() },
    },
    async ({ id, completed, date }) => result(await setTaskCompletion(id, completed, date))
  );

  server.registerTool(
    "create_habit",
    {
      title: "Create habit",
      description: "Create a habit. weekdays uses Sunday=0 through Saturday=6.",
      inputSchema: {
        title: z.string().min(1).max(120),
        weekdays: z.array(z.number().int().min(0).max(6)).min(1).optional(),
        iconKey: z.string().min(1).max(40).optional(),
        isActive: z.boolean().optional(),
      },
    },
    async ({ title, weekdays, iconKey, isActive }) => {
      await ensureDatabaseReady();
      const sortOrder = await prisma.dailyTask.count();
      const habit = await prisma.dailyTask.create({
        data: {
          title,
          weekdays: toWeekdaysJson(weekdays ?? [0, 1, 2, 3, 4, 5, 6]),
          iconKey: iconKey ?? "check",
          isActive: isActive ?? true,
          sortOrder,
        },
      });
      revalidateApp();
      return result(withParsedWeekdays(habit));
    }
  );

  server.registerTool(
    "update_habit",
    {
      title: "Update habit",
      description: "Update only the supplied habit fields. weekdays uses Sunday=0 through Saturday=6.",
      inputSchema: {
        id: z.string().min(1),
        title: z.string().min(1).max(120).optional(),
        weekdays: z.array(z.number().int().min(0).max(6)).min(1).optional(),
        iconKey: z.string().min(1).max(40).optional(),
        isActive: z.boolean().optional(),
      },
    },
    async ({ id, weekdays, ...input }) => {
      await ensureDatabaseReady();
      const habit = await prisma.dailyTask.update({
        where: { id },
        data: { ...input, ...(weekdays !== undefined ? { weekdays: toWeekdaysJson(weekdays) } : {}) },
      });
      revalidateApp();
      return result(withParsedWeekdays(habit));
    }
  );

  server.registerTool(
    "set_habit_completion",
    {
      title: "Set habit completion",
      description: "Mark a habit complete or incomplete for a day. Defaults to today; date must be YYYY-MM-DD.",
      inputSchema: { id: z.string().min(1), completed: z.boolean(), date: dateInput.optional() },
    },
    async ({ id, completed, date }) => result(await setHabitCompletion(id, completed, date))
  );

  server.registerTool(
    "get_stats",
    {
      title: "Get DailyHub statistics",
      description: "Return the 14-day analytics overview, headline metrics, and daily completion series.",
      annotations: { readOnlyHint: true },
    },
    async () => {
      await ensureDatabaseReady();
      const analytics = await getAnalyticsData();
      return result({
        rangeDays: analytics.rangeDays,
        overview: analytics.overview,
        bigStats: analytics.bigStats,
        completionsByDay: analytics.completionsByDay,
      });
    }
  );

  return server;
}
