import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const root = process.cwd();

if (!existsSync(join(root, "src", "lib", "prisma.ts"))) {
  process.exit(0);
}

function resolvePrismaCli() {
  try {
    const require = createRequire(join(root, "package.json"));
    const cli = join(dirname(require.resolve("prisma/package.json")), "build", "index.js");
    if (existsSync(cli)) {
      return cli;
    }
  } catch {
    // Fall through to a missing-cli error below.
  }

  return null;
}

const prismaCli = resolvePrismaCli();
if (!prismaCli) {
  console.warn("Prisma CLI not found; skipping generate.");
  process.exit(0);
}

const commands = [[], ["--schema", "prisma/sqlite/schema.prisma"]];

for (const extraArgs of commands) {
  const result = spawnSync(process.execPath, [prismaCli, "generate", ...extraArgs], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
