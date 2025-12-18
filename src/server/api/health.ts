import { Hono } from "hono";
import { db } from "../db/client";
import type { Variables } from "./types";

export const healthApi = new Hono<{ Variables: Variables }>();

/**
 * Health check endpoint
 * Returns the health status of the application and database
 */
healthApi.get("/", async (c) => {
  try {
    // Check database connection
    await db.$queryRaw`SELECT 1`;
    
    return c.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (error) {
    return c.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      503
    );
  }
});

