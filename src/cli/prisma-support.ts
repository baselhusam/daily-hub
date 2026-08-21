import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  getBinaryTargetForCurrentPlatform,
  getNodeAPIName,
} from "@prisma/get-platform";

type RunCommand = (
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  cwd?: string
) => Promise<void>;

export function sqliteDatabaseUrl(dataDir: string): string {
  const databasePath = join(dataDir, "data.db");
  return `${pathToFileURL(databasePath).href}?busy_timeout=10000`;
}

export function sqliteGeneratedDir(packageRoot: string): string {
  return join(packageRoot, ".next", "standalone", "src", "generated", "sqlite");
}

export function resolvePrismaCli(packageRoot: string): {
  command: string;
  prefixArgs: string[];
} {
  const candidates = [
    join(packageRoot, "node_modules", "prisma", "build", "index.js"),
    join(packageRoot, "..", "prisma", "build", "index.js"),
  ];

  try {
    const requireFromPackage = createRequire(join(packageRoot, "package.json"));
    candidates.unshift(
      join(dirname(requireFromPackage.resolve("prisma/package.json")), "build", "index.js")
    );
  } catch {
    // Use the filesystem fallbacks below.
  }

  for (const cli of candidates) {
    if (existsSync(cli)) {
      return { command: process.execPath, prefixArgs: [cli] };
    }
  }

  return {
    command: process.platform === "win32" ? "npx.cmd" : "npx",
    prefixArgs: ["prisma"],
  };
}

export async function ensureSqliteQueryEngine(
  packageRoot: string,
  runCommand: RunCommand,
  env: NodeJS.ProcessEnv
): Promise<string> {
  const binaryTarget = await getBinaryTargetForCurrentPlatform();
  const engineName = getNodeAPIName(binaryTarget, "fs");
  const destDir = sqliteGeneratedDir(packageRoot);
  const destPath = join(destDir, engineName);

  const searchDirs = [
    destDir,
    join(packageRoot, "src", "generated", "sqlite"),
  ];

  for (const dir of searchDirs) {
    const candidate = join(dir, engineName);
    if (!existsSync(candidate)) {
      continue;
    }

    if (candidate !== destPath) {
      mkdirSync(destDir, { recursive: true });
      cpSync(candidate, destPath);
    }

    return destPath;
  }

  console.warn(
    `Prisma query engine for ${binaryTarget} is not in the package. Generating a native engine...`
  );
  await generateNativeSqliteEngine(packageRoot, runCommand, env, destDir, destPath, engineName);
  return destPath;
}

async function generateNativeSqliteEngine(
  packageRoot: string,
  runCommand: RunCommand,
  env: NodeJS.ProcessEnv,
  destDir: string,
  destPath: string,
  engineName: string
): Promise<void> {
  const schemaPath = join(packageRoot, "prisma", "sqlite", "schema.prisma");
  if (!existsSync(schemaPath)) {
    throw new Error(`Missing Prisma schema at ${schemaPath}.`);
  }

  const tempDir = join(packageRoot, ".tmp", "prisma-native");
  rmSync(tempDir, { recursive: true, force: true });
  mkdirSync(tempDir, { recursive: true });
  const outputDir = join(tempDir, "client");
  const tempSchemaPath = join(tempDir, "schema.prisma");

  try {
    const schema = readFileSync(schemaPath, "utf8")
      .replace(/output\s*=\s*"[^"]+"/, `output = "${outputDir.replace(/\\/g, "/")}"`)
      .replace(/binaryTargets\s*=\s*\[[^\]]*\]/, 'binaryTargets = ["native"]');
    writeFileSync(tempSchemaPath, schema);

    const prisma = resolvePrismaCli(packageRoot);
    await runCommand(
      prisma.command,
      [...prisma.prefixArgs, "generate", "--schema", tempSchemaPath],
      { ...env, PRISMA_HIDE_UPDATE_MESSAGE: "1" },
      packageRoot
    );

    const enginePath = join(outputDir, engineName);
    if (!existsSync(enginePath)) {
      throw new Error(
        `Prisma could not generate a query engine for this platform (${engineName}).`
      );
    }

    mkdirSync(destDir, { recursive: true });
    cpSync(enginePath, destPath);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}
