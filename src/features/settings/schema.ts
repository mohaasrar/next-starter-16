import { z } from "zod";

export const settingsSchema = z.object({
  siteName: z.string().min(1, "Site name is required"),
  siteDescription: z.string().optional(),
  theme: z.enum(["light", "dark", "system"]).default("system"),
  emailNotifications: z.boolean().default(true),
  maintenanceMode: z.boolean().default(false),
});

export type SettingsInput = z.infer<typeof settingsSchema>;


