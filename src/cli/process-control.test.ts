import { describe, expect, it } from "vitest";
import {
  parseChildPids,
  stopProcessTree,
  waitForExit,
  type ProcessOps,
} from "./process-control";

const PARENT = 100;
const SERVER = 101;

/**
 * A fake process table on a fake clock. `onSignal` decides what a signal does
 * to a pid: return the delay after which it exits, or null to ignore it.
 */
function fakeProcesses(
  running: number[],
  onSignal: (pid: number, signal: NodeJS.Signals) => number | null
) {
  let clock = 0;
  const alive = new Set(running);
  const exitsAt = new Map<number, number>();
  const signals: Array<[number, NodeJS.Signals]> = [];

  const settle = () => {
    for (const [pid, at] of exitsAt) {
      if (clock >= at) {
        alive.delete(pid);
        exitsAt.delete(pid);
      }
    }
  };

  const ops: ProcessOps = {
    isRunning: (pid) => {
      settle();
      return alive.has(pid);
    },
    kill: (pid, signal) => {
      signals.push([pid, signal]);
      if (!alive.has(pid)) return;
      const delay = onSignal(pid, signal);
      if (delay === null) return;
      const at = clock + delay;
      exitsAt.set(pid, Math.min(exitsAt.get(pid) ?? Infinity, at));
    },
    sleep: async (ms) => {
      clock += ms;
    },
    now: () => clock,
  };

  return { ops, signals, isAlive: (pid: number) => ops.isRunning(pid) };
}

describe("stopProcessTree", () => {
  it("reports a clean stop when the tree exits within the grace period", async () => {
    // The parent forwards SIGTERM; both are gone a second later.
    const fake = fakeProcesses([PARENT, SERVER], (_pid, signal) =>
      signal === "SIGTERM" ? 1000 : 0
    );
    const stopFake = { ...fake.ops };
    stopFake.kill = (pid, signal) => {
      fake.ops.kill(pid, signal);
      if (pid === PARENT && signal === "SIGTERM") fake.ops.kill(SERVER, "SIGTERM");
    };

    const outcome = await stopProcessTree(
      { parentPid: PARENT, childPids: [SERVER] },
      5000,
      stopFake
    );

    expect(outcome).toEqual({ result: "stopped" });
    expect(fake.signals.some(([, signal]) => signal === "SIGKILL")).toBe(false);
  });

  it("SIGKILLs the server, then the parent, when a draining server ignores SIGTERM", async () => {
    // The 0.2.2 → 0.2.3 upgrade: MCP connections keep Next draining forever.
    const fake = fakeProcesses([PARENT, SERVER], (_pid, signal) =>
      signal === "SIGKILL" ? 0 : null
    );

    const outcome = await stopProcessTree(
      { parentPid: PARENT, childPids: [SERVER] },
      5000,
      fake.ops
    );

    expect(outcome).toEqual({ result: "forced", killed: [SERVER, PARENT] });
    expect(fake.signals).toEqual([
      [PARENT, "SIGTERM"],
      [SERVER, "SIGKILL"],
      [PARENT, "SIGKILL"],
    ]);
    expect(fake.isAlive(PARENT) || fake.isAlive(SERVER)).toBe(false);
  });

  it("signals an orphaned server directly when its parent is already gone", async () => {
    const fake = fakeProcesses([SERVER], (_pid, signal) => (signal === "SIGTERM" ? 200 : 0));

    const outcome = await stopProcessTree(
      { parentPid: PARENT, childPids: [SERVER] },
      5000,
      fake.ops
    );

    expect(outcome).toEqual({ result: "stopped" });
    expect(fake.signals).toEqual([[SERVER, "SIGTERM"]]);
  });

  it("reports failure instead of success when even SIGKILL does not take", async () => {
    const fake = fakeProcesses([PARENT, SERVER], () => null);

    const outcome = await stopProcessTree(
      { parentPid: PARENT, childPids: [SERVER] },
      5000,
      fake.ops
    );

    expect(outcome).toEqual({ result: "failed", survivors: [SERVER, PARENT] });
  });
});

describe("waitForExit", () => {
  it("gives up at the timeout", async () => {
    const fake = fakeProcesses([PARENT], () => null);
    expect(await waitForExit([PARENT], 1000, fake.ops)).toBe(false);
  });

  it("returns at once when nothing is running", async () => {
    const fake = fakeProcesses([], () => null);
    expect(await waitForExit([PARENT], 1000, fake.ops)).toBe(true);
  });
});

describe("parseChildPids", () => {
  it("picks out the direct children of a pid from ps output", () => {
    const output = ["    1     0", "  100     1", "  101   100", "  102   100", "  103   101", ""].join(
      "\n"
    );
    expect(parseChildPids(output, 100)).toEqual([101, 102]);
  });
});
