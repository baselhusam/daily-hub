import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const staticSrc = join(".next", "static");
const staticDest = join(".next", "standalone", ".next", "static");
const publicSrc = "public";
const publicDest = join(".next", "standalone", "public");
const standaloneEnv = join(".next", "standalone", ".env");

if (!existsSync(staticSrc)) {
  console.error("Missing .next/static. Run `npm run build` first.");
  process.exit(1);
}

mkdirSync(join(".next", "standalone", ".next"), { recursive: true });
rmSync(staticDest, { recursive: true, force: true });
cpSync(staticSrc, staticDest, { recursive: true });

if (existsSync(publicSrc)) {
  rmSync(publicDest, { recursive: true, force: true });
  cpSync(publicSrc, publicDest, { recursive: true });
  rmSync(join(publicDest, "uploads"), { recursive: true, force: true });
  mkdirSync(join(publicDest, "uploads"), { recursive: true });
}

rmSync(standaloneEnv, { force: true });

console.log("Prepared standalone bundle with static assets.");
