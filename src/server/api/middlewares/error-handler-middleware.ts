import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { Prisma } from "@prisma/client";

export const errorHandlerMiddleware = (err: Error, c: Context) => {
  // Handle Hono HTTP exceptions
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      return c.json({ error: "Record not found" }, 404);
    }
    if (err.code === "P2002") {
      return c.json({ error: "Unique constraint violation" }, 409);
    }
    return c.json(
      { error: "Database error", details: err.message },
      500
    );
  }

  // Handle Zod validation errors
  if (err instanceof z.ZodError) {
    return c.json(
      {
        error: "Validation error",
        details: err.errors,
      },
      400
    );
  }

  // Fallback for unexpected errors
  console.error("Unexpected error:", err);
  return c.json(
    { error: "Internal server error" },
    500
  );
};

