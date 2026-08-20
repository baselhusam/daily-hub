import "server-only";

import { PrismaClient as PostgresClient } from "@/generated/postgres";
import { PrismaClient as SqliteClient } from "@/generated/sqlite";

export type AppPrismaClient = PostgresClient;

const globalForPrisma = globalThis as unknown as {
  prisma: AppPrismaClient | undefined;
  sqliteClient: SqliteClient | undefined;
  sqliteConfigPromise: Promise<void> | undefined;
};

function isSqliteUrl(url: string): boolean {
  return url.startsWith("file:");
}

async function configureSqlite(client: SqliteClient): Promise<void> {
  if (globalForPrisma.sqliteConfigPromise) {
    await globalForPrisma.sqliteConfigPromise;
    return;
  }

  globalForPrisma.sqliteConfigPromise = (async () => {
    await client.$queryRawUnsafe(`PRAGMA journal_mode=WAL`);
    await client.$queryRawUnsafe(`PRAGMA busy_timeout=5000`);
    await client.$queryRawUnsafe(`PRAGMA foreign_keys=ON`);
  })();

  await globalForPrisma.sqliteConfigPromise;
}

function createPrismaClient(): AppPrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  if (isSqliteUrl(databaseUrl)) {
    const client = new SqliteClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
    globalForPrisma.sqliteClient = client;
    void configureSqlite(client).catch((error) => {
      console.error("Failed to configure SQLite:", error);
    });

    return client as unknown as AppPrismaClient;
  }

  return new PostgresClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function ensureDatabaseReady(): Promise<void> {
  if (process.env.DATABASE_URL && isSqliteUrl(process.env.DATABASE_URL)) {
    const client = globalForPrisma.sqliteClient;
    if (client) {
      await configureSqlite(client);
    }
  }
}

export { isSqliteUrl };
