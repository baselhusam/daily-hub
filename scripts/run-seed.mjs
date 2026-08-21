import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const sourceSeed = join(root, "prisma", "seed.ts");
const bundledSeed = join(root, "bin", "seed.js");
const sourcePrisma = join(root, "src", "lib", "prisma.ts");

let result;

if (existsSync(sourcePrisma) && existsSync(sourceSeed)) {
  result = spawnSync("npx", ["tsx", sourceSeed], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
} else if (existsSync(bundledSeed)) {
  result = spawnSync(process.execPath, [bundledSeed], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
} else {
  console.error("No seed script found. Run from a source checkout or a packaged CLI build.");
  process.exit(1);
}

process.exit(result.status ?? 1);
