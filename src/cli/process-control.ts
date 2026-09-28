import { execFileSync } from "node:child_process";

/**
 * Stopping the background server, kept apart from the CLI so it can be tested
 * against a fake process table.
 *
 * The background tree is two processes: the CLI parent (`start --detach-child`)
 * and the Next standalone server it spawns. SIGTERM to the parent is forwarded
 * to the server, but Next's graceful shutdown closes the listening socket and
 * then waits for every open connection — MCP clients on /mcp, keep-alive
 * sockets — so it can sit there indefinitely with the port free and data.db
 * still open. Anything that stops it has to wait, and escalate when waiting
 * does not work. SQLite's WAL makes a SIGKILL safe for committed data.
 */

/** How long `stop` lets the tree shut down on its own before SIGKILL. */
export const STOP_GRACE_MS = 6000;
/**
 * How long the CLI parent lets the server drain after forwarding SIGTERM.
 * Shorter than STOP_GRACE_MS, so a healthy parent escalates first and `stop`
 * only has to force what the parent could not.
 */
export const SHUTDOWN_GRACE_MS = 4000;
/** After SIGKILL, how long to wait for the kernel to reap the processes. */
const KILL_SETTLE_MS = 2000;
const POLL_MS = 100;

export type ProcessOps = {
  isRunning: (pid: number) => boolean;
  kill: (pid: number, signal: NodeJS.Signals) => void;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
};

export const systemProcessOps: ProcessOps = {
  isRunning(pid) {
    try {
      process.kill(pid, 0);
      return true;
    } catch (error) {
      // EPERM means it exists but belongs to someone else — still running.
      return (error as NodeJS.ErrnoException).code === "EPERM";
    }
  },
  kill(pid, signal) {
    try {
      process.kill(pid, signal);
    } catch (error) {
      // Gone between the check and the signal: that is the outcome we wanted.
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
    }
  },
  sleep: (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms)),
  now: () => Date.now(),
};

/** Resolves true once every pid has exited, false if any outlives the timeout. */
export async function waitForExit(
  pids: number[],
  timeoutMs: number,
  ops: ProcessOps
): Promise<boolean> {
  const deadline = ops.now() + timeoutMs;
  while (pids.some((pid) => ops.isRunning(pid))) {
    if (ops.now() >= deadline) return false;
    await ops.sleep(POLL_MS);
  }
  return true;
}

export type StopOutcome =
  /** Exited within the grace period. */
  | { result: "stopped" }
  /** Needed SIGKILL, and it worked. */
  | { result: "forced"; killed: number[] }
  /** Still running even after SIGKILL. */
  | { result: "failed"; survivors: number[] };

/**
 * SIGTERM the parent, wait `graceMs` for the whole tree to exit, then SIGKILL
 * whatever is left — server first, so it cannot keep the database open as an
 * orphan once its parent is gone.
 */
export async function stopProcessTree(
  tree: { parentPid: number; childPids: number[] },
  graceMs: number,
  ops: ProcessOps
): Promise<StopOutcome> {
  const all = [...tree.childPids, tree.parentPid];

  // The parent forwards SIGTERM to the server. An orphaned server has no one
  // to forward it, so it is signalled directly.
  if (ops.isRunning(tree.parentPid)) {
    ops.kill(tree.parentPid, "SIGTERM");
  } else {
    for (const pid of tree.childPids) ops.kill(pid, "SIGTERM");
  }
  if (await waitForExit(all, graceMs, ops)) {
    return { result: "stopped" };
  }

  const killed = all.filter((pid) => ops.isRunning(pid));
  for (const pid of killed) {
    ops.kill(pid, "SIGKILL");
  }

  if (await waitForExit(all, KILL_SETTLE_MS, ops)) {
    return { result: "forced", killed };
  }
  return { result: "failed", survivors: all.filter((pid) => ops.isRunning(pid)) };
}

/**
 * Direct children of `pid`, from `ps`. Only needed for a state file written
 * before the server pid was recorded; returns [] where `ps` is unavailable.
 */
export function listChildPids(pid: number): number[] {
  if (process.platform === "win32") return [];
  try {
    const output = execFileSync("ps", ["-A", "-o", "pid=,ppid="], { encoding: "utf8" });
    return parseChildPids(output, pid);
  } catch {
    return [];
  }
}

export function parseChildPids(psOutput: string, parentPid: number): number[] {
  const children: number[] = [];
  for (const line of psOutput.split("\n")) {
    const [pid, ppid] = line.trim().split(/\s+/).map(Number);
    if (Number.isInteger(pid) && ppid === parentPid) children.push(pid);
  }
  return children;
}
