import { prisma } from "@/lib/prisma";

export type AppSettings = {
  id: string;
  displayName: string;
  role: string;
  workspaceName: string;
  showStreaks: boolean;
  nudgeDays: number;
};

const DEFAULT_SETTINGS: AppSettings = {
  id: "default",
  displayName: "You",
  role: "Operator",
  workspaceName: "Personal HQ",
  showStreaks: true,
  nudgeDays: 7,
};

export async function getSettings(): Promise<AppSettings> {
  const settings = await prisma.settings.findUnique({
    where: { id: "default" },
  });

  if (!settings) {
    return DEFAULT_SETTINGS;
  }

  return settings;
}
