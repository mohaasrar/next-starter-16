import { Hono } from "hono";
import { db } from "../db/client";
import { getCurrentUser } from "../auth/get-session";
import { defineAbility } from "../auth/casl";

export const settingsApi = new Hono();

// Get settings (returns first settings record or creates default)
settingsApi.get("/", async (c) => {
  try {
    const user = await getCurrentUser();
    const ability = defineAbility({
      role: (user?.role as "user" | "admin" | "super_admin") || "user",
    });

    if (!ability.can("read", "Settings")) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const setting = await db.settings.findFirst();
    
    if (!setting) {
      // Return default settings if none exist
      return c.json({
        siteName: "My Application",
        siteDescription: "",
        theme: "system",
        emailNotifications: true,
        maintenanceMode: false,
      });
    }
    
    return c.json({
      id: setting.id,
      siteName: setting.siteName,
      siteDescription: setting.siteDescription,
      theme: setting.theme,
      emailNotifications: setting.emailNotifications,
      maintenanceMode: setting.maintenanceMode,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return c.json({ error: "Failed to fetch settings. Please check your database connection." }, 500);
  }
});

// Update settings
settingsApi.put("/", async (c) => {
  try {
    const user = await getCurrentUser();
    const ability = defineAbility({
      role: (user?.role as "user" | "admin" | "super_admin") || "user",
    });

    if (!ability.can("update", "Settings")) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const body = await c.req.json();
    
    // Check if settings exist
    const existing = await db.settings.findFirst();
    
    let result;
    if (existing) {
      // Update existing settings
      result = await db.settings.update({
        where: { id: existing.id },
        data: {
          siteName: body.siteName,
          siteDescription: body.siteDescription,
          theme: body.theme,
          emailNotifications: body.emailNotifications,
          maintenanceMode: body.maintenanceMode,
        },
      });
    } else {
      // Create new settings
      result = await db.settings.create({
        data: {
          siteName: body.siteName,
          siteDescription: body.siteDescription,
          theme: body.theme || "system",
          emailNotifications: body.emailNotifications ?? true,
          maintenanceMode: body.maintenanceMode ?? false,
        },
      });
    }
    
    return c.json({
      id: result.id,
      siteName: result.siteName,
      siteDescription: result.siteDescription,
      theme: result.theme,
      emailNotifications: result.emailNotifications,
      maintenanceMode: result.maintenanceMode,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return c.json({ error: "Failed to update settings. Please check your database connection." }, 500);
  }
});
