import { createMongoAbility, MongoQuery } from "@casl/ability";
import { createPrismaAbility } from "@casl/prisma";
import type { AppAbility } from "./casl";
import get from "lodash/get";

export type RoleAbility = {
  id?: string;
  action: string;
  subject: string;
  conditions?: Record<string, any> | null;
  fields?: string[];
  inverted?: boolean;
  reason?: string | null;
};

type PrismaAbility = ReturnType<typeof createPrismaAbility>;

/**
 * Interpolate values in conditions (e.g., ${user.id})
 */
const interpolateValue = (
  value: unknown,
  vars: Record<string, unknown>,
): unknown => {
  if (typeof value === "string") {
    if (value.startsWith("${") && value.endsWith("}")) {
      const key = value.slice(2, -1);
      const resolved = get(vars, key);
      if (resolved === undefined) {
        throw new ReferenceError(`Variable "${key}" is not defined`);
      }
      return resolved;
    }
    const lowered = value.toLowerCase();
    return lowered === "true" ? true : lowered === "false" ? false : value;
  }
  return value;
};

/**
 * Process conditions recursively, interpolating variables
 */
const processConditions = (
  input: unknown,
  vars: Record<string, unknown>,
  { expandDotNotation = false }: { expandDotNotation?: boolean } = {},
): MongoQuery | unknown => {
  if (typeof input !== "object" || input === null) {
    return interpolateValue(input, vars);
  }

  if (Array.isArray(input)) {
    return input.map((item) =>
      processConditions(item, vars, { expandDotNotation }),
    );
  }

  let entries = Object.entries(input as Record<string, unknown>);

  if (expandDotNotation) {
    const expanded: Record<string, unknown> = {};
    for (const [key, val] of entries) {
      if (key.includes(".")) {
        const parts = key.split(".");
        let current = expanded;
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          current[part] ??= {};
          current = current[part] as Record<string, unknown>;
        }
        current[parts[parts.length - 1]] = val;
      } else {
        expanded[key] = val;
      }
    }
    entries = Object.entries(expanded);
  }

  const processed = Object.fromEntries(
    entries.map(([k, v]) => [
      k,
      processConditions(v, vars, { expandDotNotation }),
    ]),
  ) as MongoQuery;

  return processed;
};

/**
 * Build CASL abilities from database abilities
 */
export const buildAbilities = (
  dbAbilities: RoleAbility[],
  vars: Record<string, unknown>,
) => {
  const raw = dbAbilities.map(({ fields, inverted, reason, ...rest }) => ({
    ...rest,
    fields: fields?.length ? fields : undefined,
    inverted: inverted ?? false,
    reason: reason ?? undefined,
  }));

  const frontend = raw.map((a) => ({
    ...a,
    conditions: a.conditions
      ? processConditions(a.conditions, vars)
      : undefined,
  })) as any[];

  const prisma = raw.map((a) => ({
    ...a,
    conditions: a.conditions
      ? processConditions(a.conditions, vars, { expandDotNotation: true })
      : undefined,
  })) as any[];

  return {
    ability: createMongoAbility(frontend) as AppAbility,
    prismaAbility: createPrismaAbility(prisma) as PrismaAbility,
    frontend,
  };
};

