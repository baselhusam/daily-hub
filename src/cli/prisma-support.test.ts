import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  databaseUrl,
  generatedClientDir,
  queryEngineSearchDirs,
} from "./prisma-support";

describe("prisma-support", () => {
  it("builds a sqlite file URL with a busy timeout", () => {
    const url = databaseUrl("/tmp/data");
    expect(url).toContain("data.db");
    expect(url).toContain("busy_timeout=10000");
  });

  it("installs query engines where the bundled Next.js client looks", () => {
    const dirs = queryEngineSearchDirs("/pkg");
    expect(dirs).toContain(generatedClientDir("/pkg"));
    expect(dirs).toContain("/pkg/.next/standalone/.next/server");
    expect(dirs).toContain("/pkg/.next/standalone/prisma");
    expect(dirs).toContain("/pkg/.next/standalone");
  });
});

describe("prisma schema", () => {
  it("declares query engines for macOS, Windows, and Linux", () => {
    const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
    for (const target of [
      "darwin-arm64",
      "darwin",
      "windows",
      "debian-openssl-3.0.x",
      "linux-musl",
      "linux-arm64-openssl-3.0.x",
    ]) {
      expect(schema).toContain(target);
    }
  });
});
