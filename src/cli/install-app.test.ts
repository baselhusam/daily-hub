import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { defaultAppDir, installApp, macosAssetDir } from "./install-app";

const temporaries: string[] = [];

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), "install-app-test-"));
  temporaries.push(dir);
  return dir;
}

afterEach(() => {
  while (temporaries.length > 0) {
    rmSync(temporaries.pop()!, { recursive: true, force: true });
  }
});

const noopRun = async () => {};

describe("defaultAppDir", () => {
  it("installs per-user, which needs no administrator rights", () => {
    expect(defaultAppDir()).toBe(join(homedir(), "Applications"));
  });
});

describe("installApp", () => {
  it("reports which asset is missing rather than writing a broken bundle", async () => {
    const packageRoot = scratch();
    const assets = macosAssetDir(packageRoot);
    mkdirSync(assets, { recursive: true });
    writeFileSync(join(assets, "launcher.sh"), "#!/bin/bash\n");
    // Info.plist and icon-1024.png deliberately absent.

    const appDir = scratch();
    await expect(
      installApp({ packageRoot, version: "9.9.9", appMode: false, appDir }, noopRun),
    ).rejects.toThrow(/Info\.plist/);
  });

  it("refuses to run anywhere but macOS", async () => {
    const original = process.platform;
    Object.defineProperty(process, "platform", { value: "linux", configurable: true });
    try {
      await expect(
        installApp(
          { packageRoot: scratch(), version: "9.9.9", appMode: false, appDir: scratch() },
          noopRun,
        ),
      ).rejects.toThrow(/only runs on macOS/);
    } finally {
      Object.defineProperty(process, "platform", { value: original, configurable: true });
    }
  });
});
