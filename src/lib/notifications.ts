import { prisma } from "@/lib/prisma";
import { toDateOnlyString } from "@/lib/dates";

export type NotificationKind = "overdue" | "due_today" | "habits" | "stalled";
export type NotificationTone = "warn" | "signal" | "neutral";

export type NotificationProject = {
  id: string;
  name: string;
  logoUrl: string | null;
  iconKey: string;
  color: string | null;
};

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  href: string;
  actionLabel?: string;
  tone: NotificationTone;
  project?: NotificationProject;
};

export type StalledProject = NotificationProject & {
  idleDays: number;
  lastTouch?: string;
};

export type NotificationInput = {
  overdueCount: number;
  dueTodayCount: number;
  remainingHabits: number;
  nudgeDays: number;
  stalled: StalledProject[];
};

export async function getProjectLastTouchMap(): Promise<Map<string, string>> {
  const [tasks, logs] = await Promise.all([
    prisma.task.findMany({
      where: { projectId: { not: null } },
      select: { id: true, projectId: true },
    }),
    prisma.completionLog.findMany({
      where: { entityType: "TASK" },
      select: { entityId: true, completedOn: true },
    }),
  ]);

  const taskProject = new Map(
    tasks.flatMap((task) =>
      task.projectId ? [[task.id, task.projectId] as const] : []
    )
  );

  const lastTouch = new Map<string, string>();
  for (const log of logs) {
    const projectId = taskProject.get(log.entityId);
    if (!projectId) continue;
    const key = toDateOnlyString(log.completedOn);
    const prev = lastTouch.get(projectId);
    if (!prev || key > prev) lastTouch.set(projectId, key);
  }

  return lastTouch;
}

export function idleDaysSince(
  lastTouch: string | undefined,
  today: Date,
  neverValue: number
): number {
  if (!lastTouch) return neverValue;
  return Math.floor(
    (today.getTime() - new Date(lastTouch).getTime()) / 86400000
  );
}

export function getStalledProjects(
  projects: Array<NotificationProject & { openCount: number }>,
  lastTouch: Map<string, string>,
  today: Date,
  nudgeDays: number
): StalledProject[] {
  return projects.flatMap((project) => {
    if (project.openCount === 0) return [];
    const last = lastTouch.get(project.id);
    const idleDays = idleDaysSince(last, today, nudgeDays + 1);
    if (idleDays < nudgeDays) return [];
    return [
      {
        id: project.id,
        name: project.name,
        logoUrl: project.logoUrl,
        iconKey: project.iconKey,
        color: project.color,
        idleDays,
        lastTouch: last,
      },
    ];
  });
}

export function buildNotifications({
  overdueCount,
  dueTodayCount,
  remainingHabits,
  nudgeDays,
  stalled,
}: NotificationInput): AppNotification[] {
  const items: AppNotification[] = [];

  if (overdueCount > 0) {
    items.push({
      id: "overdue",
      kind: "overdue",
      title: `${overdueCount} task${overdueCount === 1 ? " is" : "s are"} past due`,
      detail: "Open Today to clear them",
      href: "/",
      tone: "warn",
    });
  }

  if (dueTodayCount > 0) {
    items.push({
      id: "due-today",
      kind: "due_today",
      title: `${dueTodayCount} task${dueTodayCount === 1 ? "" : "s"} due today`,
      detail: "Scheduled for today",
      href: "/",
      tone: "signal",
    });
  }

  if (remainingHabits > 0) {
    items.push({
      id: "habits",
      kind: "habits",
      title: `${remainingHabits} habit${remainingHabits === 1 ? "" : "s"} left today`,
      detail: "Still open on Today",
      href: "/",
      tone: "signal",
    });
  }

  for (const project of stalled) {
    items.push({
      id: `stalled:${project.id}`,
      kind: "stalled",
      title: project.name,
      detail: project.lastTouch
        ? `Untouched for ${project.idleDays} days`
        : `Untouched for ${nudgeDays}+ days`,
      href: `/?project=${project.id}`,
      actionLabel: "Focus",
      tone: "neutral",
      project: {
        id: project.id,
        name: project.name,
        logoUrl: project.logoUrl,
        iconKey: project.iconKey,
        color: project.color,
      },
    });
  }

  return items;
}
