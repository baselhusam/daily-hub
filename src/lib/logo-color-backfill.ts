import { Prisma } from "@/generated/client";

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/** A project whose colour can still be derived from its logo. */
export type LogoColorCandidate = { id: string; logoUrl: string };

/** One extracted colour, on its way back from the browser. */
export type LogoColorResult = { id: string; color: string };

/**
 * What the browser should do about the backfill on this load. `pending` is
 * false once the database has been stamped — the candidate list alone cannot
 * say that, since "nothing left to fill" and "already done" both look empty.
 */
export type LogoColorBackfillPlan = {
  pending: boolean;
  candidates: LogoColorCandidate[];
};

type ProjectColorRow = {
  id: string;
  logoUrl: string | null;
  color: string | null;
  colorSource: string;
};

/**
 * The projects the one-time backfill should look at: they have a logo to read,
 * no colour yet, and nothing the user chose by hand. A project without a logo
 * is deliberately left alone — `projectAccent()` already gives it a stable
 * palette colour, and storing that would break "reset to auto".
 */
export function selectLogoColorCandidates(
  projects: ProjectColorRow[]
): LogoColorCandidate[] {
  return projects
    .filter(
      (project): project is ProjectColorRow & { logoUrl: string } =>
        Boolean(project.logoUrl) &&
        project.color === null &&
        project.colorSource !== "manual"
    )
    .map((project) => ({ id: project.id, logoUrl: project.logoUrl }));
}

/** Drops anything that is not a well-formed hex colour, and normalises case. */
export function sanitizeLogoColorResults(
  results: LogoColorResult[]
): LogoColorResult[] {
  const seen = new Set<string>();

  return results.flatMap((result) => {
    if (!result.id || seen.has(result.id)) return [];
    if (!HEX_COLOR.test(result.color)) return [];
    seen.add(result.id);
    return [{ id: result.id, color: result.color.toUpperCase() }];
  });
}

/**
 * Written as raw SQL on purpose, for two reasons:
 *
 * - `Project.updatedAt` carries `@updatedAt`, so a Prisma `update` (or
 *   `updateMany`) would restamp every backfilled row. Projects are ordered by
 *   `updatedAt` on the dashboard, so that would silently reshuffle the user's
 *   Today page the first time they opened the app after upgrading.
 * - The `colorSource`/`color` guard belongs in the statement itself, so a
 *   colour the user picked can never be overwritten even if the browser sends
 *   a stale candidate list.
 */
export function buildLogoColorUpdate(result: LogoColorResult): Prisma.Sql {
  return Prisma.sql`
    UPDATE "Project"
    SET "color" = ${result.color}
    WHERE "id" = ${result.id}
      AND "color" IS NULL
      AND "colorSource" = 'auto'
  `;
}
