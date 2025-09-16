import { PrismaClient } from "@prisma/client";
import { logger } from "../telemetry/logger";

declare global {
  var __prisma: PrismaClient | undefined;
}

// Prevent multiple instances of Prisma Client in development
export const db = globalThis.__prisma || new PrismaClient({
  log: [
    { level: "query", emit: "event" },
    { level: "error", emit: "stdout" },
    { level: "info", emit: "stdout" },
    { level: "warn", emit: "stdout" }
  ]
});

if (process.env.NODE_ENV === "development") {
  globalThis.__prisma = db;
}

// Log database queries in development
if (process.env.NODE_ENV === "development") {
  db.$on("query", (e) => {
    logger.debug({
      type: "db_query",
      query: e.query,
      params: e.params,
      duration: e.duration
    });
  });
}

// Graceful shutdown
process.on("beforeExit", async () => {
  await db.$disconnect();
});

export default db;
