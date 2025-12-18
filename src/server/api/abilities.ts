import { Hono } from "hono";
import { getAbilityFromContext, getCurrentUserFromContext } from "./middlewares";
import type { Variables } from "./types";

export const abilitiesApi = new Hono<{ Variables: Variables }>();

/**
 * Get current user's abilities
 * Returns the ability object rules for the frontend
 */
abilitiesApi.get("/", async (c) => {
  try {
    const ability = getAbilityFromContext(c);
    const currentUser = getCurrentUserFromContext(c);

    if (!ability || !currentUser) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Extract rules from the ability for the frontend
    // CASL rules format: { action, subject, inverted?, conditions?, fields?, reason? }
    const rules = ability.rules.map((rule: any) => ({
      action: rule.action,
      subject: rule.subject,
      inverted: rule.inverted || false,
      conditions: rule.conditions || undefined,
      fields: rule.fields || undefined,
    }));

    return c.json({
      rules,
      role: currentUser.role || "user",
      user: {
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.role || "user",
      },
    });
  } catch (error) {
    console.error("Error fetching abilities:", error);
    return c.json({ error: "Failed to fetch abilities" }, 500);
  }
});

