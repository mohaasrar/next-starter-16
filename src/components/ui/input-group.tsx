"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Textarea } from "./textarea";

const InputGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative flex flex-col", className)}
    {...props}
  />
));
InputGroup.displayName = "InputGroup";

const InputGroupText = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "inline-flex items-center text-sm text-muted-foreground",
      className
    )}
    {...props}
  />
));
InputGroupText.displayName = "InputGroupText";

const InputGroupAddon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    align?: "block-start" | "block-end" | "inline-start" | "inline-end";
  }
>(({ className, align = "block-end", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex",
      align === "block-start" && "justify-start",
      align === "block-end" && "justify-end",
      align === "inline-start" && "items-start",
      align === "inline-end" && "items-end",
      className
    )}
    {...props}
  />
));
InputGroupAddon.displayName = "InputGroupAddon";

const InputGroupTextarea = React.forwardRef<
  React.ElementRef<typeof Textarea>,
  React.ComponentPropsWithoutRef<typeof Textarea>
>(({ className, ...props }, ref) => (
  <Textarea
    ref={ref}
    className={cn("resize-none", className)}
    {...props}
  />
));
InputGroupTextarea.displayName = "InputGroupTextarea";

export { InputGroup, InputGroupText, InputGroupAddon, InputGroupTextarea };


