import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { SQLITE_ENGINE_FILES } from "./prisma-engines.mjs";

const staticSrc = join(".next", "static");
const staticDest = join(".next", "standalone", ".next", "static");
const publicSrc = "public";
const publicDest = join(".next", "standalone", "public");
const generatedSrc = join("src", "generated", "client");
const generatedDest = join(".next", "standalone", "src", "generated", "client");
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

if (!existsSync(generatedSrc)) {
  console.error(
    "Missing src/generated/client. Run `npm run db:generate` before packaging."
  );
  process.exit(1);
}

mkdirSync(join(".next", "standalone", "src", "generated"), { recursive: true });
rmSync(generatedDest, { recursive: true, force: true });
cpSync(generatedSrc, generatedDest, { recursive: true });

const present = new Set(readdirSync(generatedDest));
const missing = SQLITE_ENGINE_FILES.filter((file) => !present.has(file));

if (missing.length > 0) {
  console.error("Standalone bundle is missing Prisma query engines:");
  for (const file of missing) {
    console.error(`  - ${file}`);
  }
  console.error(
    "Add the matching binaryTargets in prisma/schema.prisma and re-run prisma generate."
  );
  process.exit(1);
}

const generatedClient = readFileSync(join(generatedDest, "index.js"), "utf8");
const missingTargets = [
  "darwin-arm64",
  "darwin",
  "windows",
  "debian-openssl-3.0.x",
].filter((target) => !generatedClient.includes(target));

if (missingTargets.length > 0) {
  console.error(
    "Generated Prisma Client is missing binaryTargets (packaging would fail on those platforms):"
  );
  for (const target of missingTargets) {
    console.error(`  - ${target}`);
  }
  process.exit(1);
}

rmSync(standaloneEnv, { force: true });

console.log(
  `Prepared standalone bundle with ${SQLITE_ENGINE_FILES.length} SQLite Prisma engines.`
);
