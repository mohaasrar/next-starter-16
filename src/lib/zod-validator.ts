import type { ValidationTargets } from "hono";
import { ZodSchema } from "zod";
import { zValidator as zv } from "@hono/zod-validator";

/**
 * Zod validator for Hono with custom error handling
 */
export const zValidator = <
  T extends ZodSchema,
  Target extends keyof ValidationTargets,
>(
  target: Target,
  schema: T,
) =>
  zv(target, schema, (result, c) => {
    if (!result.success) {
      throw result.error;
    }
  });

