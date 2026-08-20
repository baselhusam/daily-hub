import { homedir } from "os";
import { join } from "path";

export function getDataDir(): string {
  if (process.env.DAILYHUB_DATA_DIR) {
    return process.env.DAILYHUB_DATA_DIR;
  }

  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (databaseUrl.startsWith("file:")) {
    return join(homedir(), ".daily-hub");
  }

  return process.cwd();
}

export function getUploadsDir(): string {
  if (process.env.DAILYHUB_DATA_DIR) {
    return join(process.env.DAILYHUB_DATA_DIR, "uploads");
  }

  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (databaseUrl.startsWith("file:")) {
    return join(homedir(), ".daily-hub", "uploads");
  }

  return join(process.cwd(), "public", "uploads");
}

export function getSqliteDatabasePath(dataDir = getDataDir()): string {
  return join(dataDir, "data.db");
}

export function getSqliteDatabaseUrl(dataDir = getDataDir()): string {
  const path = getSqliteDatabasePath(dataDir);
  return `file:${path}?busy_timeout=10000`;
}
