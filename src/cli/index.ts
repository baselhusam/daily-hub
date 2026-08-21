import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:net";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import {
  databaseUrl,
  ensureQueryEngine,
  resolvePrismaCli,
} from "./prisma-support";

declare const __dirname: string;

const packageRoot = resolve(__dirname, "..");
const schemaPath = join(packageRoot, "prisma", "schema.prisma");
const standaloneServerPath = join(packageRoot, ".next", "standalone", "server.js");
const bundledSeedPath = join(packageRoot, "bin", "seed.js");

type CliOptions = {
  port: number;
  dataDir: string;
  openBrowser: boolean;
  seed: boolean;
  command: "start" | "seed";
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    port: 9999,
    dataDir: process.env.DAILYHUB_DATA_DIR ?? join(homedir(), ".daily-hub"),
    openBrowser: true,
    seed: false,
    command: "start",
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];

    if (arg === "seed") {
      options.command = "seed";
      continue;
    }

    if (arg === "--no-open") {
      options.openBrowser = false;
      continue;
    }

    if (arg === "--seed") {
      options.seed = true;
      continue;
    }

    if (arg === "--port") {
      const value = Number(argv[index + 1]);
      if (!Number.isInteger(value) || value < 1 || value > 65535) {
        throw new Error("Expected --port to be an integer between 1 and 65535.");
      }
      options.port = value;
      index++;
      continue;
    }

    if (arg === "--data-dir") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Expected a path after --data-dir.");
      }
      options.dataDir = resolve(value);
      index++;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function openBrowser(url: string) {
  const command =
    process.platform === "win32"
      ? "cmd"
      : process.platform === "darwin"
        ? "open"
        : "xdg-open";
  const args =
    process.platform === "win32" ? ["/c", "start", "", url] : [url];

  spawn(command, args, {
    detached: true,
    stdio: "ignore",
  }).unref();
}

function packageVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(packageRoot, "package.json"), "utf8")
    ) as { version?: string };
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

function printHelp() {
  console.log(`DailyHub CLI v${packageVersion()}

Usage:
  daily-hub [options]
  daily-hub seed [options]

Options:
  --port <number>     Port for the web app (default: 9999)
  --data-dir <path>   Data directory (default: ~/.daily-hub)
  --no-open           Do not open the browser automatically
  --seed              Seed sample data on first start
  -h, --help          Show this help message
`);
}

function runCommand(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  cwd = packageRoot
): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });
  });
}

async function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const server = createServer();
    server.once("error", () => resolvePromise(true));
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolvePromise(false));
    });
  });
}

async function assertPortAvailable(port: number) {
  if (await isPortInUse(port)) {
    throw new Error(
      `Port ${port} is already in use. Another DailyHub instance may be running — stop it first, or pass --port to choose another port.`
    );
  }
}

async function waitForServer(url: string, timeoutMs = 120_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.ok || response.status === 307 || response.status === 308) {
        return;
      }
    } catch {
      // Server not ready yet.
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }

  throw new Error(`Timed out waiting for DailyHub at ${url}`);
}

async function prepareDataDir(dataDir: string) {
  await mkdir(join(dataDir, "uploads"), { recursive: true });
}

function buildEnv(options: CliOptions, queryEnginePath?: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NODE_ENV: "production",
    DATABASE_URL: databaseUrl(options.dataDir),
    DAILYHUB_DATA_DIR: options.dataDir,
    PORT: String(options.port),
    HOSTNAME: "127.0.0.1",
    ...(queryEnginePath
      ? { PRISMA_QUERY_ENGINE_LIBRARY: queryEnginePath }
      : {}),
  };
}

async function preparePrisma(options: CliOptions): Promise<NodeJS.ProcessEnv> {
  const env = buildEnv(options);
  const queryEnginePath = await ensureQueryEngine(packageRoot, runCommand, env);
  return buildEnv(options, queryEnginePath);
}

async function migrateDatabase(env: NodeJS.ProcessEnv, dataDir: string) {
  const maxAttempts = 5;
  const prisma = resolvePrismaCli(packageRoot);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await runCommand(
        prisma.command,
        [...prisma.prefixArgs, "migrate", "deploy", "--schema", schemaPath],
        env
      );
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const locked = message.includes("database is locked");
      if (!locked || attempt === maxAttempts) {
        if (locked) {
          throw new Error(
            `SQLite database at ${join(dataDir, "data.db")} is locked. Stop any other DailyHub process (check port ${env.PORT ?? 9999}), then retry. If nothing is running, delete ${join(dataDir, "data.db-wal")} and ${join(dataDir, "data.db-shm")} and try again.`
          );
        }
        throw error;
      }

      await new Promise((resolvePromise) => setTimeout(resolvePromise, attempt * 500));
    }
  }
}

async function seedDatabase(env: NodeJS.ProcessEnv) {
  if (existsSync(bundledSeedPath)) {
    await runCommand(process.execPath, [bundledSeedPath], env);
    return;
  }

  await runCommand("npx", ["tsx", join(packageRoot, "prisma", "seed.ts")], env);
}

async function startServer(options: CliOptions) {
  const env = await preparePrisma(options);
  const url = `http://127.0.0.1:${options.port}`;

  await prepareDataDir(options.dataDir);
  await assertPortAvailable(options.port);
  await migrateDatabase(env, options.dataDir);

  if (options.seed) {
    await seedDatabase(env);
  }

  const server = spawn(process.execPath, [standaloneServerPath], {
    cwd: join(packageRoot, ".next", "standalone"),
    env,
    stdio: "inherit",
  });

  const shutdown = async () => {
    if (!server.killed) {
      server.kill("SIGTERM");
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  server.on("error", (error) => {
    console.error(error);
    process.exit(1);
  });

  server.on("exit", (code, signal) => {
    if (signal) {
      process.exit(0);
    }
    process.exit(code ?? 0);
  });

  await waitForServer(url);
  console.log(`DailyHub v${packageVersion()} is running at ${url}`);
  console.log(`Data directory: ${options.dataDir}`);

  if (options.openBrowser) {
    await openBrowser(url);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  console.log(`DailyHub v${packageVersion()}`);

  if (options.command === "seed") {
    const env = await preparePrisma(options);
    await prepareDataDir(options.dataDir);
    await migrateDatabase(env, options.dataDir);
    await seedDatabase(env);
    console.log(`Seeded DailyHub data in ${options.dataDir}`);
    return;
  }

  await startServer(options);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
