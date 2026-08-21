import { homedir } from "os";
import { dirname, join } from "path";

function parseSqlitePathFromUrl(databaseUrl: string): string | null {
  if (!databaseUrl.startsWith("file:")) {
    return null;
  }

  const pathPart = databaseUrl.slice("file:".length).split("?")[0];
  if (!pathPart) {
    return null;
  }

  return pathPart.startsWith("//") ? pathPart.slice(2) : pathPart;
}

export function getDataDir(): string {
  if (process.env.DAILYHUB_DATA_DIR) {
    return process.env.DAILYHUB_DATA_DIR;
  }

  const databaseUrl = process.env.DATABASE_URL ?? "";
  const databasePath = parseSqlitePathFromUrl(databaseUrl);
  if (databasePath) {
    return dirname(databasePath);
  }

  return join(homedir(), ".daily-hub");
}

export function getUploadsDir(): string {
  return join(getDataDir(), "uploads");
}

export function getSqliteDatabasePath(dataDir = getDataDir()): string {
  return join(dataDir, "data.db");
}

export function getSqliteDatabaseUrl(dataDir = getDataDir()): string {
  const path = getSqliteDatabasePath(dataDir);
  return `file:${path}?busy_timeout=10000`;
}
