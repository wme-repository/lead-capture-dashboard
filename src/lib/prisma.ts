import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

function createPrismaClient() {
  const dbUrl = (process.env.DATABASE_URL ?? "file:./prisma/dev.db")
    .replace(/^file:/, "")
    .split("?")[0]; // strip query params — adapter handles WAL via pragma
  const adapter = new PrismaBetterSqlite3({
    url: dbUrl,
    // Enable WAL mode and busy timeout for concurrent write safety
    timeout: 5000,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
