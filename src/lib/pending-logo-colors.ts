import { prisma } from "@/lib/prisma";
import {
  selectLogoColorCandidates,
  type LogoColorBackfillPlan,
} from "@/lib/logo-color-backfill";

const DONE: LogoColorBackfillPlan = { pending: false, candidates: [] };

/**
 * Whether the one-time logo-colour backfill still has to run, and on which
 * projects.
 *
 * Databases created before project colours existed have logos but no colours,
 * and colours are extracted in the browser (a `<canvas>` reads the pixels), so
 * the migration cannot fill them in. The app hands this to the client once,
 * after which `Settings.logoColorsBackfilledAt` is stamped and this stops
 * looking at projects at all.
 */
export async function getLogoColorBackfillPlan(): Promise<LogoColorBackfillPlan> {
  const settings = await prisma.settings.findUnique({
    where: { id: "default" },
    select: { logoColorsBackfilledAt: true },
  });

  if (settings?.logoColorsBackfilledAt) return DONE;

  const projects = await prisma.project.findMany({
    where: { logoUrl: { not: null }, color: null, colorSource: "auto" },
    select: { id: true, logoUrl: true, color: true, colorSource: true },
  });

  return { pending: true, candidates: selectLogoColorCandidates(projects) };
}
