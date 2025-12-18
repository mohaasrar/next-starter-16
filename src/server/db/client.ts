import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/lib/env";

// Type augmentation for globalThis - using interface to avoid conflicts
interface GlobalPrisma {
  prisma?: PrismaClient;
  pool?: Pool;
}

declare const globalThis: typeof global & GlobalPrisma;

// Create PostgreSQL pool
const getPool = (): Pool => {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Please configure your database connection in .env file.");
  }
  if (!globalThis.pool) {
    globalThis.pool = new Pool({
      connectionString: env.DATABASE_URL,
    });
  }
  return globalThis.pool;
};

// Create Prisma adapter
const adapter = new PrismaPg(getPool());

// Lazy initialization - only create Prisma instance when needed
export const db =
  globalThis.prisma ??
  new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalThis.prisma = db;
}
