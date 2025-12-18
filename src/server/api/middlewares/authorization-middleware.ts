import { Context, Next } from "hono";
import type { AppAbility } from "@/server/auth/casl";
import { db } from "@/server/db/client";
import type { Variables } from "../types";
import { buildAbilities, type RoleAbility } from "@/server/auth/build-abilities";

/**
 * Global authorization middleware that builds abilities from database
 * This runs on all routes and stores the ability in context
 */
export async function authorizationMiddleware(c: Context<{ Variables: Variables }>, next: Next) {
  const user = c.get("user");
  const session = c.get("session");

  // If no user or session, continue (some routes might be public)
  if (!user || !session) {
    return next();
  }

  try {
    // Fetch user with role and abilities from database
    const currentUser = await db.user.findUnique({
      where: { id: user.id },
      include: {
        role: {
          include: {
            abilities: true,
          },
        },
      },
    });

    if (!currentUser) {
      return c.json({ error: "User not found" }, 404);
    }

    if (!currentUser.role) {
      return c.json({ error: "No role assigned" }, 403);
    }

    // Build abilities from database records
    const { ability } = buildAbilities(
      currentUser.role.abilities as RoleAbility[],
      {
        user: currentUser,
      },
    );

    // Store in context for use in route handlers
    // Using type assertion to work around Hono's type constraints
    (c as any).set("ability", ability);
    (c as any).set("currentUser", {
      id: currentUser.id,
      email: currentUser.email,
      name: currentUser.name,
      role: currentUser.role.name, // Role name from database
      image: currentUser.image,
      createdAt: currentUser.createdAt,
      updatedAt: currentUser.updatedAt,
    });

    return next();
  } catch (error) {
    console.error("Authorization middleware error:", error);
    return c.json({ error: "Authorization error" }, 500);
  }
}

/**
 * Middleware to check if user has permission for an action
 */
export const authorize =
  (
    action: "create" | "read" | "update" | "delete" | "manage",
    subject: "User" | "Settings" | "all"
  ) =>
  async (c: Context<{ Variables: Variables }>, next: Next) => {
    const ability = (c as any).get("ability") as AppAbility | undefined;

    if (!ability) {
      return c.json(
        { error: "Authorization not initialized" },
        500
      );
    }

    if (!ability.can(action, subject)) {
      return c.json(
        {
          error: "Forbidden",
          message: `You don't have permission to ${action} ${subject}`,
        },
        403
      );
    }

    return next();
  };

/**
 * Get current user from context
 */
export const getCurrentUserFromContext = (c: Context<{ Variables: Variables }>) => {
  return (c as any).get("currentUser") as Variables["currentUser"];
};

/**
 * Get ability from context
 */
export const getAbilityFromContext = (c: Context<{ Variables: Variables }>): AppAbility | undefined => {
  return (c as any).get("ability") as AppAbility | undefined;
};

