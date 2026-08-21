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

export function databaseUrl(dataDir: string): string {
  const databasePath = join(dataDir, "data.db");
  return `${pathToFileURL(databasePath).href}?busy_timeout=10000`;
}

export function generatedClientDir(packageRoot: string): string {
  return join(packageRoot, ".next", "standalone", "src", "generated", "client");
}

export function queryEngineSearchDirs(packageRoot: string): string[] {
  const standaloneRoot = join(packageRoot, ".next", "standalone");
  return [
    generatedClientDir(packageRoot),
    join(packageRoot, "src", "generated", "client"),
    join(standaloneRoot, ".next", "server"),
    join(standaloneRoot, ".next", "server", "chunks"),
    join(standaloneRoot, ".prisma", "client"),
    join(standaloneRoot, "prisma"),
    standaloneRoot,
  ];
}

function copyEngineToSearchDirs(enginePath: string, engineName: string, packageRoot: string): string {
  const destPath = join(generatedClientDir(packageRoot), engineName);
  for (const dir of queryEngineSearchDirs(packageRoot)) {
    mkdirSync(dir, { recursive: true });
    const target = join(dir, engineName);
    if (target !== enginePath && !existsSync(target)) {
      cpSync(enginePath, target);
    }
  }
  return destPath;
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

export async function ensureQueryEngine(
  packageRoot: string,
  runCommand: RunCommand,
  env: NodeJS.ProcessEnv
): Promise<string> {
  const binaryTarget = await getBinaryTargetForCurrentPlatform();
  const engineName = getNodeAPIName(binaryTarget, "fs");

  for (const dir of queryEngineSearchDirs(packageRoot)) {
    const candidate = join(dir, engineName);
    if (!existsSync(candidate)) {
      continue;
    }

    return copyEngineToSearchDirs(candidate, engineName, packageRoot);
  }

  console.warn(
    `Prisma query engine for ${binaryTarget} is not in the package. Generating a native engine...`
  );
  return generateNativeEngine(packageRoot, runCommand, env, engineName, binaryTarget);
}

async function generateNativeEngine(
  packageRoot: string,
  runCommand: RunCommand,
  env: NodeJS.ProcessEnv,
  engineName: string,
  binaryTarget: string
): Promise<string> {
  const schemaPath = join(packageRoot, "prisma", "schema.prisma");
  if (!existsSync(schemaPath)) {
    throw missingEngineError(binaryTarget, engineName);
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
      throw missingEngineError(binaryTarget, engineName);
    }

    return copyEngineToSearchDirs(enginePath, engineName, packageRoot);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function missingEngineError(binaryTarget: string, engineName: string): Error {
  return new Error(
    `DailyHub could not load the database engine for ${binaryTarget} (${engineName}).
npx may be using an old install from a parent node_modules folder.
Run the published version explicitly:

  npx @baselhusam/daily-hub@latest`
  );
}

// Backward-compatible aliases for any external imports.
export const sqliteDatabaseUrl = databaseUrl;
export const sqliteGeneratedDir = generatedClientDir;
export const ensureSqliteQueryEngine = ensureQueryEngine;
