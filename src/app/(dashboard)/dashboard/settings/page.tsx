"use client";

import { SettingsForm } from "@/features/settings/components";
import { Card, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
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
