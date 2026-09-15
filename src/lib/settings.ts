import { prisma } from "@/lib/prisma";

/** 1 = Monday, 0 = Sunday. */
export type WeekStart = 0 | 1;

export type AppSettings = {
  id: string;
  displayName: string;
  workspaceName: string;
  showStreaks: boolean;
  nudgeDays: number;
  weekStartsOn: WeekStart;
};

const DEFAULT_SETTINGS: AppSettings = {
  id: "default",
  displayName: "You",
  workspaceName: "Personal HQ",
  showStreaks: true,
  nudgeDays: 7,
  weekStartsOn: 1,
};

export function toWeekStart(value: number | null | undefined): WeekStart {
  return value === 0 ? 0 : 1;
}

export async function getSettings(): Promise<AppSettings> {
  const settings = await prisma.settings.findUnique({
    where: { id: "default" },
  });

  if (!settings) {
    return DEFAULT_SETTINGS;
  }

  return {
    id: settings.id,
    displayName: settings.displayName,
    workspaceName: settings.workspaceName,
    showStreaks: settings.showStreaks,
    nudgeDays: settings.nudgeDays,
    weekStartsOn: toWeekStart(settings.weekStartsOn),
  };
}
