import { spawn } from "node:child_process";
import {
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
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
  detach: boolean;
  detachedChild: boolean;
  command: "start" | "seed" | "status" | "stop" | "logs";
};

type BackgroundState = {
  pid: number;
  port: number;
  startedAt: string;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    port: 9999,
    dataDir: process.env.DAILYHUB_DATA_DIR ?? join(homedir(), ".daily-hub"),
    openBrowser: true,
    seed: false,
    detach: false,
    detachedChild: false,
    command: "start",
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];

    if (arg === "seed" || arg === "start" || arg === "status" || arg === "stop" || arg === "logs") {
      options.command = arg;
      continue;
    }

    if (arg === "--detach") {
      options.detach = true;
      continue;
    }

    if (arg === "--detach-child") {
      options.detachedChild = true;
      options.openBrowser = false;
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

  if (options.detach && options.command !== "start") {
    throw new Error("--detach can only be used when starting DailyHub.");
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
  --detach            Start in the background and return after it is ready
  --seed              Seed sample data on first start

Commands:
  start               Start DailyHub (default)
  seed                Seed sample data and exit
  status              Show whether a detached instance is running
  stop                Stop a detached instance
  logs                Print the most recent detached-instance log output
  -h, --help          Show this help message
`);
}

function backgroundStatePath(dataDir: string) {
  return join(dataDir, "daily-hub.pid");
}

function backgroundLogPath(dataDir: string) {
  return join(dataDir, "daily-hub.log");
}

function readBackgroundState(dataDir: string): BackgroundState | undefined {
  try {
    const state = JSON.parse(readFileSync(backgroundStatePath(dataDir), "utf8")) as BackgroundState;
    if (!Number.isInteger(state.pid) || state.pid < 1 || !Number.isInteger(state.port)) {
      return undefined;
    }
    return state;
  } catch {
    return undefined;
  }
}

function isProcessRunning(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function removeBackgroundState(dataDir: string, pid?: number) {
  const state = readBackgroundState(dataDir);
  if (pid !== undefined && state?.pid !== pid) {
    return;
  }

  try {
    unlinkSync(backgroundStatePath(dataDir));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

function writeBackgroundState(dataDir: string, port: number) {
  const state: BackgroundState = {
    pid: process.pid,
    port,
    startedAt: new Date().toISOString(),
  };
  writeFileSync(backgroundStatePath(dataDir), `${JSON.stringify(state)}\n`, "utf8");
}

function printBackgroundStatus(dataDir: string) {
  const state = readBackgroundState(dataDir);
  if (!state) {
    console.log("DailyHub is not running in the background.");
    return;
  }

  if (!isProcessRunning(state.pid)) {
    removeBackgroundState(dataDir);
    console.log("DailyHub is not running in the background (removed stale state).");
    return;
  }

  console.log(`DailyHub is running in the background at http://127.0.0.1:${state.port} (PID ${state.pid}).`);
  console.log(`Log file: ${backgroundLogPath(dataDir)}`);
}

function stopBackgroundServer(dataDir: string) {
  const state = readBackgroundState(dataDir);
  if (!state) {
    console.log("DailyHub is not running in the background.");
    return;
  }

  if (!isProcessRunning(state.pid)) {
    removeBackgroundState(dataDir);
    console.log("DailyHub is not running in the background (removed stale state).");
    return;
  }

  process.kill(state.pid, "SIGTERM");
  console.log(`Stopping DailyHub background process (PID ${state.pid}).`);
}

function printBackgroundLogs(dataDir: string) {
  const logPath = backgroundLogPath(dataDir);
  if (!existsSync(logPath)) {
    console.log(`No background log has been created at ${logPath}.`);
    return;
  }

  const lines = readFileSync(logPath, "utf8").trimEnd().split("\n");
  console.log(lines.slice(-100).join("\n"));
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

async function startDetached(options: CliOptions, rawArgs: string[]) {
  await prepareDataDir(options.dataDir);

  const logPath = backgroundLogPath(options.dataDir);
  const logFile = openSync(logPath, "a");
  const childArgs = rawArgs.filter((arg) => arg !== "--detach");
  childArgs.push("--detach-child", "--no-open");

  const child = spawn(process.execPath, [process.argv[1], ...childArgs], {
    cwd: process.cwd(),
    detached: true,
    stdio: ["ignore", logFile, logFile],
  });

  let childFailure: Error | undefined;
  child.once("error", (error) => {
    childFailure = error;
  });
  child.once("exit", (code, signal) => {
    childFailure = new Error(
      `Background process exited ${signal ? `from ${signal}` : `with code ${code ?? "unknown"}`}.`
    );
  });
  child.unref();
  closeSync(logFile);

  const url = `http://127.0.0.1:${options.port}`;
  try {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 120_000) {
      if (childFailure) {
        throw childFailure;
      }

      try {
        const response = await fetch(url, { redirect: "manual" });
        if (response.ok || response.status === 307 || response.status === 308) {
          break;
        }
      } catch {
        // Server not ready yet.
      }

      await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
    }

    if (childFailure) {
      throw childFailure;
    }

    if (Date.now() - startedAt >= 120_000) {
      throw new Error(`Timed out waiting for DailyHub at ${url}`);
    }
  } catch (error) {
    throw new Error(
      `DailyHub did not start in the background. Check ${logPath} for details. ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  console.log(`DailyHub v${packageVersion()} is running in the background at ${url}`);
  console.log(`Log file: ${logPath}`);
  console.log(`Manage it with: npx @baselhusam/daily-hub status | logs | stop`);

  if (options.openBrowser) {
    await openBrowser(url);
  }
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

  if (options.detachedChild) {
    writeBackgroundState(options.dataDir, options.port);
  }

  const shutdown = async () => {
    if (!server.killed) {
      server.kill("SIGTERM");
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  server.on("error", (error) => {
    if (options.detachedChild) {
      removeBackgroundState(options.dataDir, process.pid);
    }
    console.error(error);
    process.exit(1);
  });

  server.on("exit", (code, signal) => {
    if (options.detachedChild) {
      removeBackgroundState(options.dataDir, process.pid);
    }
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
  const rawArgs = process.argv.slice(2);
  const options = parseArgs(rawArgs);
  console.log(`DailyHub v${packageVersion()}`);

  if (options.command === "status") {
    printBackgroundStatus(options.dataDir);
    return;
  }

  if (options.command === "stop") {
    stopBackgroundServer(options.dataDir);
    return;
  }

  if (options.command === "logs") {
    printBackgroundLogs(options.dataDir);
    return;
  }

  if (options.command === "seed") {
    const env = await preparePrisma(options);
    await prepareDataDir(options.dataDir);
    await migrateDatabase(env, options.dataDir);
    await seedDatabase(env);
    console.log(`Seeded DailyHub data in ${options.dataDir}`);
    return;
  }

  if (options.detach) {
    await startDetached(options, rawArgs);
    return;
  }

  await startServer(options);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
