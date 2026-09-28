import { spawn } from "node:child_process";
import {
  closeSync,
  chmodSync,
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
import { randomBytes } from "node:crypto";
import {
  databaseUrl,
  ensureQueryEngine,
  resolvePrismaCli,
} from "./prisma-support";
import { defaultAppDir, installApp } from "./install-app";
import {
  SHUTDOWN_GRACE_MS,
  STOP_GRACE_MS,
  listChildPids,
  stopProcessTree,
  systemProcessOps,
} from "./process-control";

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
  mcpEnabled: boolean;
  detach: boolean;
  detachedChild: boolean;
  appMode: boolean;
  appDir?: string;
  command: "start" | "seed" | "status" | "stop" | "logs" | "mcp" | "update" | "install-app";
};

type BackgroundState = {
  /** The CLI parent (`start --detach-child`). */
  pid: number;
  /** The Next server it spawned; absent in state written before 0.2.4. */
  serverPid?: number;
  port: number;
  startedAt: string;
};

type McpConfig = {
  token: string;
};

const packageName = "@baselhusam/daily-hub";

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    port: 9999,
    dataDir: process.env.DAILYHUB_DATA_DIR ?? join(homedir(), ".daily-hub"),
    openBrowser: true,
    seed: false,
    mcpEnabled: true,
    detach: false,
    detachedChild: false,
    appMode: false,
    command: "start",
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];

    if (arg === "seed" || arg === "start" || arg === "status" || arg === "stop" || arg === "logs" || arg === "mcp" || arg === "update" || arg === "install-app") {
      options.command = arg;
      continue;
    }

    if (arg === "--update") {
      options.command = "update";
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

    if (arg === "--no-mcp") {
      options.mcpEnabled = false;
      continue;
    }

    if (arg === "--seed") {
      options.seed = true;
      continue;
    }

    if (arg === "--app-mode") {
      options.appMode = true;
      continue;
    }

    if (arg === "--app-dir") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Expected a path after --app-dir.");
      }
      options.appDir = resolve(value);
      index++;
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

  if (options.detach && options.command !== "start" && options.command !== "update") {
    throw new Error("--detach can only be used when starting or updating DailyHub.");
  }

  if (!options.mcpEnabled && options.command === "mcp") {
    throw new Error("--no-mcp cannot be used with the mcp command.");
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
  --no-mcp            Disable the local MCP endpoint
  --detach            Start in the background and return after it is ready
  --seed              Seed sample data on first start
  --update            Run the latest published DailyHub version
  --app-mode          install-app: open a chromeless window, not a browser tab
  --app-dir <path>    install-app: where to write DailyHub.app

Commands:
  start               Start DailyHub (default)
  seed                Seed sample data and exit
  status              Show whether a detached instance is running
  stop                Stop a detached instance
  logs                Print the most recent detached-instance log output
  mcp                 Print MCP connection details for a running instance
  update              Run the latest published DailyHub version
  install-app         Install DailyHub.app into ~/Applications (macOS)
  -h, --help          Show this help message
`);
}

function backgroundStatePath(dataDir: string) {
  return join(dataDir, "daily-hub.pid");
}

function backgroundLogPath(dataDir: string) {
  return join(dataDir, "daily-hub.log");
}

function mcpConfigPath(dataDir: string) {
  return join(dataDir, "daily-hub-mcp.json");
}

function readMcpConfig(dataDir: string): McpConfig | undefined {
  try {
    const config = JSON.parse(readFileSync(mcpConfigPath(dataDir), "utf8")) as McpConfig;
    return typeof config.token === "string" && config.token.length >= 32 ? config : undefined;
  } catch {
    return undefined;
  }
}

function getOrCreateMcpConfig(dataDir: string): McpConfig {
  const existing = readMcpConfig(dataDir);
  if (existing) return existing;

  const config = { token: randomBytes(32).toString("base64url") };
  writeFileSync(mcpConfigPath(dataDir), `${JSON.stringify(config)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  chmodSync(mcpConfigPath(dataDir), 0o600);
  return config;
}

function printMcpConnection(dataDir: string, port: number) {
  const config = readMcpConfig(dataDir);
  if (!config) {
    console.log(`No DailyHub MCP configuration was found at ${mcpConfigPath(dataDir)}.`);
    console.log("Start DailyHub without --no-mcp first.");
    return;
  }

  const url = `http://127.0.0.1:${port}/mcp`;
  console.log(`DailyHub MCP endpoint: ${url}`);
  console.log("Configure your MCP client with:");
  console.log(JSON.stringify({
    url,
    headers: { Authorization: `Bearer ${config.token}` },
  }, null, 2));
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
  return systemProcessOps.isRunning(pid);
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

function writeBackgroundState(dataDir: string, port: number, serverPid?: number) {
  const state: BackgroundState = {
    pid: process.pid,
    ...(serverPid ? { serverPid } : {}),
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

async function stopBackgroundServer(dataDir: string) {
  const state = readBackgroundState(dataDir);
  if (!state) {
    console.log("DailyHub is not running in the background.");
    return;
  }

  // The server can outlive its parent (a parent killed on its own leaves it
  // orphaned, still holding data.db), so it is checked as well.
  const childPids =
    state.serverPid !== undefined ? [state.serverPid] : listChildPids(state.pid);
  const alive = [state.pid, ...childPids].filter(isProcessRunning);
  if (alive.length === 0) {
    removeBackgroundState(dataDir);
    console.log("DailyHub is not running in the background (removed stale state).");
    return;
  }

  console.log(`Stopping DailyHub background process (PID ${state.pid})...`);
  const outcome = await stopProcessTree(
    { parentPid: state.pid, childPids },
    STOP_GRACE_MS,
    systemProcessOps
  );

  if (outcome.result === "failed") {
    console.error(
      `DailyHub is still running (PID ${outcome.survivors.join(", ")}) after SIGKILL. Stop it by hand before starting DailyHub again.`
    );
    process.exitCode = 1;
    return;
  }

  // A parent that was SIGKILLed never got to remove its own state file.
  removeBackgroundState(dataDir, state.pid);
  if (outcome.result === "forced") {
    console.log(
      `DailyHub did not shut down within ${STOP_GRACE_MS / 1000}s, so it was force-stopped (PID ${outcome.killed.join(", ")}). Saved data is intact.`
    );
    return;
  }
  console.log("DailyHub stopped.");
}

/**
 * Refuse to start over a background instance that is still alive. A server
 * mid-shutdown has already closed its port, so the port check alone misses
 * it — and it still holds data.db, which would fail the migration with a raw
 * "database is locked".
 */
function assertNoBackgroundInstance(dataDir: string) {
  const state = readBackgroundState(dataDir);
  if (!state || state.pid === process.pid) return;

  const pids = [state.pid, ...(state.serverPid !== undefined ? [state.serverPid] : [])];
  if (!pids.some(isProcessRunning)) {
    removeBackgroundState(dataDir);
    return;
  }

  throw new Error(
    `DailyHub is already running in the background (PID ${state.pid}, port ${state.port}). Run "daily-hub stop" first.`
  );
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
  cwd = packageRoot,
  stdio: "inherit" | "ignore" | "tee" = "inherit"
): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: stdio === "tee" ? ["inherit", "pipe", "pipe"] : stdio,
      shell: process.platform === "win32",
    });

    // "tee" still shows the output, and keeps it so a caller can tell one
    // failure from another.
    let output = "";
    if (stdio === "tee") {
      child.stdout?.on("data", (chunk: Buffer) => {
        process.stdout.write(chunk);
        output += chunk.toString();
      });
      child.stderr?.on("data", (chunk: Buffer) => {
        process.stderr.write(chunk);
        output += chunk.toString();
      });
    }

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      reject(
        Object.assign(
          new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`),
          { output }
        )
      );
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

function buildEnv(
  options: CliOptions,
  queryEnginePath?: string,
  mcpConfig?: McpConfig
): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NODE_ENV: "production",
    DATABASE_URL: databaseUrl(options.dataDir),
    DAILYHUB_DATA_DIR: options.dataDir,
    PORT: String(options.port),
    HOSTNAME: "127.0.0.1",
    DAILYHUB_MCP_ENABLED: String(options.mcpEnabled),
    ...(mcpConfig ? { DAILYHUB_MCP_TOKEN: mcpConfig.token } : {}),
    ...(queryEnginePath
      ? { PRISMA_QUERY_ENGINE_LIBRARY: queryEnginePath }
      : {}),
  };
}

async function preparePrisma(
  options: CliOptions,
  mcpConfig?: McpConfig
): Promise<NodeJS.ProcessEnv> {
  const env = buildEnv(options, undefined, mcpConfig);
  const queryEnginePath = await ensureQueryEngine(packageRoot, runCommand, env);
  return buildEnv(options, queryEnginePath, mcpConfig);
}

async function migrateDatabase(env: NodeJS.ProcessEnv, dataDir: string) {
  const maxAttempts = 5;
  const prisma = resolvePrismaCli(packageRoot);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await runCommand(
        prisma.command,
        [...prisma.prefixArgs, "migrate", "deploy", "--schema", schemaPath],
        env,
        packageRoot,
        "tee"
      );
      return;
    } catch (error) {
      // Prisma prints the cause rather than putting it in the exit code, so
      // it is read from the captured output.
      const output = (error as { output?: string }).output ?? "";
      const message = error instanceof Error ? error.message : String(error);
      const locked = `${message}\n${output}`.includes("database is locked");
      if (!locked || attempt === maxAttempts) {
        if (locked) {
          // Never suggest deleting data.db-wal: after a crash or a SIGKILL it
          // holds committed writes that have not reached data.db yet.
          throw new Error(
            `SQLite database at ${join(dataDir, "data.db")} is locked by another process. Run "daily-hub stop", or stop whatever else has the database open, then start DailyHub again.`
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
  assertNoBackgroundInstance(options.dataDir);

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
  const url = `http://127.0.0.1:${options.port}`;

  await prepareDataDir(options.dataDir);
  const mcpConfig = options.mcpEnabled
    ? getOrCreateMcpConfig(options.dataDir)
    : undefined;
  const env = await preparePrisma(options, mcpConfig);
  assertNoBackgroundInstance(options.dataDir);
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
    writeBackgroundState(options.dataDir, options.port, server.pid);
  }

  // Next's graceful shutdown waits on open connections (MCP clients, keep-
  // alive sockets) and can wait forever, so a second chance is not optional.
  let serverExited = false;
  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown || serverExited) return;
    shuttingDown = true;
    server.kill("SIGTERM");
    setTimeout(() => {
      if (!serverExited) {
        console.error(
          `DailyHub server did not exit within ${SHUTDOWN_GRACE_MS / 1000}s of SIGTERM; forcing it.`
        );
        server.kill("SIGKILL");
      }
    }, SHUTDOWN_GRACE_MS);
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
    serverExited = true;
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
  if (mcpConfig) {
    console.log(`MCP server: ${url}/mcp`);
    console.log(`Run \"daily-hub mcp\" to print the connection configuration.`);
  }

  if (options.openBrowser) {
    await openBrowser(url);
  }
}

async function runLatest(rawArgs: string[]) {
  const forwardedArgs = rawArgs.filter(
    (arg) => arg !== "update" && arg !== "--update"
  );

  console.log("Updating DailyHub and starting the latest published version...");
  await runCommand(
    "npx",
    ["--yes", `${packageName}@latest`, ...forwardedArgs],
    process.env,
    process.cwd()
  );
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
    await stopBackgroundServer(options.dataDir);
    return;
  }

  if (options.command === "logs") {
    printBackgroundLogs(options.dataDir);
    return;
  }

  if (options.command === "mcp") {
    printMcpConnection(options.dataDir, options.port);
    return;
  }

  if (options.command === "update") {
    await runLatest(rawArgs);
    return;
  }

  if (options.command === "install-app") {
    const destination = await installApp(
      {
        packageRoot,
        version: packageVersion(),
        appMode: options.appMode,
        appDir: options.appDir,
      },
      (command, args, env, cwd) => runCommand(command, args, env, cwd, "ignore"),
    );
    console.log(`Installed ${destination}`);
    console.log("Open it from Spotlight or Launchpad, or keep it in the Dock.");
    if (options.appDir === undefined) {
      console.log(`Move it to /Applications if you would rather it live there than in ${defaultAppDir()}.`);
    }
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
