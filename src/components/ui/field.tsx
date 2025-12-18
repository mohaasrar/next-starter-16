"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

const Field = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    "data-invalid"?: boolean;
  }
>(({ className, "data-invalid": invalid, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("space-y-2", invalid && "text-destructive", className)}
    data-invalid={invalid}
    {...props}
  />
));
Field.displayName = "Field";

const FieldLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => (
  <Label ref={ref} className={cn("text-sm font-medium", className)} {...props} />
));
FieldLabel.displayName = "FieldLabel";

const FieldDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
FieldDescription.displayName = "FieldDescription";

const FieldError = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & {
    errors?: Array<{ message?: string } | undefined>;
  }
>(({ className, errors, ...props }, ref) => {
  if (!errors || errors.length === 0 || !errors[0]) return null;
  return (
    <p
      ref={ref}
      className={cn("text-sm font-medium text-destructive", className)}
      style={{ color: 'hsl(var(--destructive))' }}
      {...props}
    >
      {errors[0]?.message}
    </p>
  );
});
FieldError.displayName = "FieldError";

const FieldGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-4", className)} {...props} />
));
FieldGroup.displayName = "FieldGroup";

const FieldOrientation = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    orientation?: "horizontal" | "vertical";
  }
>(({ className, orientation = "vertical", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex",
      orientation === "horizontal" ? "flex-row items-center gap-4" : "flex-col gap-2",
      className
    )}
    {...props}
  />
));
FieldOrientation.displayName = "FieldOrientation";

const FieldSeparator = React.forwardRef<
  HTMLHRElement,
  React.HTMLAttributes<HTMLHRElement>
>(({ className, ...props }, ref) => (
  <hr
    ref={ref}
    className={cn("my-4 border-t border-border", className)}
    {...props}
  />
));
FieldSeparator.displayName = "FieldSeparator";

export { Field, FieldLabel, FieldDescription, FieldError, FieldGroup, FieldOrientation, FieldSeparator };

