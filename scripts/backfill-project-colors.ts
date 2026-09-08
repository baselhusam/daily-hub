/**
 * Backfills the accent colour of projects that were created before logo
 * colour extraction existed: they carry colorSource "auto" but a null colour,
 * so the UI falls back to a palette colour keyed off the project id, which has
 * nothing to do with the logo.
 *
 * Dry run by default; pass --apply to write. Projects whose colour was picked
 * by hand (colorSource "manual") are never touched.
 *
 * Decoding happens through sharp, which ships with Next rather than as a
 * dependency of the app itself — the browser does this work with a canvas, and
 * a one-off maintenance script is not a reason to add an image-decoding
 * dependency to the runtime.
 */
import { basename, join } from "path";
import { readFile } from "fs/promises";
import { PrismaClient } from "../src/generated/client";
import { getSqliteDatabaseUrl, getUploadsDir } from "../src/lib/data-dir";
import { pickLogoAccentColor } from "../src/lib/logo-color";

const SIZE = 64;

// Deliberately not src/lib/prisma: that module is "server-only" and exists to
// hand a single client to the running app, neither of which fits a CLI script.
// getSqliteDatabaseUrl resolves the same way the app does (DAILYHUB_DATA_DIR,
// then DATABASE_URL, then ~/.daily-hub) rather than reading DATABASE_URL
// first — a stray .env would otherwise point this at the dev database.
const databaseUrl = getSqliteDatabaseUrl();
const prisma = new PrismaClient({ datasourceUrl: databaseUrl });

type Decoder = (bytes: Buffer) => Promise<Uint8ClampedArray>;

async function loadDecoder(): Promise<Decoder> {
  let sharp: typeof import("sharp");
  try {
    sharp = (await import("sharp")).default as unknown as typeof import("sharp");
  } catch {
    throw new Error(
      "This script needs `sharp` to decode logos. It normally comes with Next.js — try `npm install` first."
    );
  }

  return async (bytes) => {
    // Same geometry the browser uses in extractAccentFromDataUrl, so the
    // backfilled colour matches what a re-save in the UI would produce.
    const { data } = await sharp(bytes)
      .resize(SIZE, SIZE, { fit: "fill" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return new Uint8ClampedArray(data);
  };
}

async function readLogoBytes(logoUrl: string): Promise<Buffer> {
  if (/^https?:\/\//i.test(logoUrl)) {
    const response = await fetch(logoUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }

  if (!logoUrl.startsWith("/uploads/")) {
    throw new Error(`unrecognised logo path: ${logoUrl}`);
  }

  return readFile(join(getUploadsDir(), basename(logoUrl)));
}

async function main() {
  const apply = process.argv.includes("--apply");
  const decode = await loadDecoder();

  console.log(`Database: ${databaseUrl.replace(/\?.*$/, "")}\n`);

  const projects = await prisma.project.findMany({
    where: { color: null, colorSource: "auto", NOT: { logoUrl: null } },
    select: { id: true, name: true, logoUrl: true },
    orderBy: { name: "asc" },
  });

  if (projects.length === 0) {
    console.log("Nothing to backfill — every project with a logo already has a colour.");
    return;
  }

  const resolved: Array<{ id: string; name: string; color: string }> = [];

  for (const project of projects) {
    const label = project.name.padEnd(20);
    try {
      const color = pickLogoAccentColor(await decode(await readLogoBytes(project.logoUrl!)));
      if (!color) {
        console.log(`${label} skipped — no colour could be extracted`);
        continue;
      }
      console.log(`${label} ${color}`);
      resolved.push({ id: project.id, name: project.name, color });
    } catch (error) {
      console.log(`${label} skipped — ${(error as Error).message}`);
    }
  }

  if (!apply) {
    console.log(`\nDry run: ${resolved.length} project(s) would be updated. Re-run with --apply to write.`);
    return;
  }

  for (const { id, color } of resolved) {
    await prisma.project.update({ where: { id }, data: { color } });
  }

  console.log(`\nUpdated ${resolved.length} project(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
