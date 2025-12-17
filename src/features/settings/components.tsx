"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { settingsSchema, type SettingsInput } from "./schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateSettings, useSettings } from "./hooks";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export const SettingsForm = () => {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      theme: "system",
      emailNotifications: true,
      maintenanceMode: false,
    },
  });

  useEffect(() => {
    if (settings) {
      setValue("siteName", settings.siteName || "");
      setValue("siteDescription", settings.siteDescription || "");
      setValue("theme", settings.theme || "system");
      setValue("emailNotifications", settings.emailNotifications ?? true);
      setValue("maintenanceMode", settings.maintenanceMode ?? false);
    }
  }, [settings, setValue]);

  const onSubmit = async (data: SettingsInput) => {
    try {
      await updateSettings.mutateAsync(data);
    } catch (error) {
      console.error("Failed to update settings:", error);
    }
  };

  const theme = watch("theme");
  const emailNotifications = watch("emailNotifications");
  const maintenanceMode = watch("maintenanceMode");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">General Settings</h3>
        
        <div className="space-y-2">
          <Label htmlFor="siteName">Site Name</Label>
          <Input
            id="siteName"
            {...register("siteName")}
            placeholder="My Application"
            aria-invalid={errors.siteName ? "true" : "false"}
          />
          {errors.siteName && (
            <p className="text-sm text-destructive">{errors.siteName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="siteDescription">Site Description</Label>
          <Input
            id="siteDescription"
            {...register("siteDescription")}
            placeholder="A brief description of your application"
            aria-invalid={errors.siteDescription ? "true" : "false"}
          />
          {errors.siteDescription && (
            <p className="text-sm text-destructive">
              {errors.siteDescription.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="theme">Theme</Label>
          <Select
            value={theme}
            onValueChange={(value) => setValue("theme", value as "light" | "dark" | "system")}
          >
            <SelectTrigger id="theme">
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
          {errors.theme && (
            <p className="text-sm text-destructive">{errors.theme.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Preferences</h3>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="emailNotifications"
            checked={emailNotifications}
            onCheckedChange={(checked) =>
              setValue("emailNotifications", checked === true)
            }
          />
          <Label
            htmlFor="emailNotifications"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Enable email notifications
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="maintenanceMode"
            checked={maintenanceMode}
            onCheckedChange={(checked) =>
              setValue("maintenanceMode", checked === true)
            }
          />
          <Label
            htmlFor="maintenanceMode"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Maintenance mode
          </Label>
        </div>
      </div>

      <Button type="submit" disabled={updateSettings.isPending} variant="default">
        {updateSettings.isPending ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  );
};

