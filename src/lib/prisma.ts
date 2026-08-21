import "server-only";

import { PrismaClient } from "@/generated/client";

export type AppPrismaClient = PrismaClient;

const globalForPrisma = globalThis as unknown as {
  prisma: AppPrismaClient | undefined;
  configPromise: Promise<void> | undefined;
};

function assertSqliteDatabaseUrl(url: string | undefined): asserts url is string {
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  if (!url.startsWith("file:")) {
    throw new Error(
      "DailyHub now uses SQLite only. Set DATABASE_URL to a file URL, for example file:./.data/data.db"
    );
  }
}

async function configureSqlite(client: PrismaClient): Promise<void> {
  if (globalForPrisma.configPromise) {
    await globalForPrisma.configPromise;
    return;
  }

  globalForPrisma.configPromise = (async () => {
    await client.$queryRawUnsafe(`PRAGMA journal_mode=WAL`);
    await client.$queryRawUnsafe(`PRAGMA busy_timeout=5000`);
    await client.$queryRawUnsafe(`PRAGMA foreign_keys=ON`);
  })();

  await globalForPrisma.configPromise;
}

function createPrismaClient(): AppPrismaClient {
  assertSqliteDatabaseUrl(process.env.DATABASE_URL);

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function ensureDatabaseReady(): Promise<void> {
  await configureSqlite(prisma);
}

export function isSqliteUrl(url: string): boolean {
  return url.startsWith("file:");
}
