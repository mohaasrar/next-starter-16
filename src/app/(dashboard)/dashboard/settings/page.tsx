"use client";

import { SettingsForm } from "@/features/settings/components";
import { Card, CardContent } from "@/components/ui/card";
import { useAbility } from "@/lib/authorization";

export default function SettingsPage() {
  const ability = useAbility();
  const canUpdate = ability.can("update", "Settings");

  // Redirect if user doesn't have permission to view this page
  if (!canUpdate) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
          <p className="text-muted-foreground mt-2">
            You don't have permission to view this page. This page is only available to administrators.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your application settings and preferences
          </p>
        </div>
      </div>

      <Card>
        <CardContent>
          <SettingsForm />
        </CardContent>
      </Card>
    </div>
  );
}
