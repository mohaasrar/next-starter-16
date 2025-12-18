"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>Application Error</CardTitle>
              </div>
              <CardDescription>
                A critical error occurred. Please refresh the page or contact support.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === "development" && (
                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm font-mono text-muted-foreground">
                    {error.message}
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={reset} variant="default">
                  Try again
                </Button>
                <Button onClick={() => (window.location.href = "/")} variant="outline">
                  Go home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  );
}

