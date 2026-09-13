import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

export type RunCommand = (
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  cwd?: string,
) => Promise<void>;

export type InstallAppOptions = {
  packageRoot: string;
  version: string;
  appMode: boolean;
  appDir?: string;
};

// One entry per size macOS expects in an .icns; iconutil rejects the set if any
// of these are missing.
const ICONSET_SIZES: ReadonlyArray<[number, string]> = [
  [16, "icon_16x16"],
  [32, "icon_16x16@2x"],
  [32, "icon_32x32"],
  [64, "icon_32x32@2x"],
  [128, "icon_128x128"],
  [256, "icon_128x128@2x"],
  [256, "icon_256x256"],
  [512, "icon_256x256@2x"],
  [512, "icon_512x512"],
  [1024, "icon_512x512@2x"],
];

export function defaultAppDir(): string {
  // ~/Applications needs no administrator rights and still shows in Spotlight
  // and Launchpad. macOS creates it on demand.
  return join(homedir(), "Applications");
}

export function macosAssetDir(packageRoot: string): string {
  return join(packageRoot, "scripts", "macos");
}

/**
 * Writes DailyHub.app into the applications directory.
 *
 * The bundle is a launcher, not a packaged app: it starts this same CLI in the
 * background and opens the UI. Everything it needs ships in the package, and the
 * icon is assembled with sips and iconutil, which are always present on macOS —
 * so this never reaches the network or needs a build toolchain.
 */
export async function installApp(
  options: InstallAppOptions,
  runCommand: RunCommand,
): Promise<string> {
  if (process.platform !== "darwin") {
    throw new Error("daily-hub install-app builds a macOS app bundle and only runs on macOS.");
  }

  const assets = macosAssetDir(options.packageRoot);
  const launcherSource = join(assets, "launcher.sh");
  const plistSource = join(assets, "Info.plist");
  const iconSource = join(assets, "icon-1024.png");

  for (const required of [launcherSource, plistSource, iconSource]) {
    if (!existsSync(required)) {
      throw new Error(
        `This DailyHub package is missing ${required}, so the app bundle cannot be built.`,
      );
    }
  }

  const appDir = options.appDir ?? defaultAppDir();
  mkdirSync(appDir, { recursive: true });

  // Assemble somewhere temporary and swap it in, so a failure halfway through
  // cannot leave a half-written bundle where a working one used to be.
  const staging = mkdtempSync(join(tmpdir(), "dailyhub-app-"));
  const app = join(staging, "DailyHub.app");
  const macosDir = join(app, "Contents", "MacOS");
  const resourcesDir = join(app, "Contents", "Resources");
  mkdirSync(macosDir, { recursive: true });
  mkdirSync(resourcesDir, { recursive: true });

  try {
    writeFileSync(
      join(app, "Contents", "Info.plist"),
      readFileSync(plistSource, "utf8").replaceAll("__VERSION__", options.version),
    );

    // Point the launcher at this install's own CLI so a normal launch skips npx
    // entirely. The launcher checks the path still exists before using it, so an
    // npx cache that gets cleared degrades to a download rather than breaking.
    let launcher = readFileSync(launcherSource, "utf8").replaceAll(
      "__REPO_CLI__",
      join(options.packageRoot, "bin", "daily-hub.js"),
    );
    if (options.appMode) {
      launcher = launcher.replace(
        'APP_MODE="${DAILYHUB_APP_MODE:-0}"',
        'APP_MODE="${DAILYHUB_APP_MODE:-1}"',
      );
    }
    const launcherPath = join(macosDir, "DailyHub");
    writeFileSync(launcherPath, launcher);
    chmodSync(launcherPath, 0o755);

    const iconset = join(staging, "DailyHub.iconset");
    mkdirSync(iconset, { recursive: true });
    for (const [size, name] of ICONSET_SIZES) {
      await runCommand(
        "sips",
        ["-z", String(size), String(size), iconSource, "--out", join(iconset, `${name}.png`)],
        { ...process.env, PATH: process.env.PATH ?? "" },
        staging,
      );
    }
    await runCommand(
      "iconutil",
      ["-c", "icns", iconset, "-o", join(resourcesDir, "DailyHub.icns")],
      { ...process.env, PATH: process.env.PATH ?? "" },
      staging,
    );

    // Ad-hoc signature: gives the bundle a stable identity so macOS does not
    // re-evaluate it on every launch. It is not a Developer ID and this bundle
    // is not distributable.
    try {
      await runCommand(
        "codesign",
        ["--force", "--deep", "--sign", "-", app],
        { ...process.env, PATH: process.env.PATH ?? "" },
        staging,
      );
    } catch {
      // Signing is a nicety; the app runs either way.
    }

    const destination = join(appDir, "DailyHub.app");
    rmSync(destination, { recursive: true, force: true });
    await runCommand(
      "/bin/mv",
      [app, destination],
      { ...process.env, PATH: process.env.PATH ?? "" },
      staging,
    );
    return destination;
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}
