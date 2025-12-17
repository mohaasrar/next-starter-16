"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldOrientation,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateAuthUser, useUpdateAuthUser } from "./hooks";

const authUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["user", "admin", "super_admin"]).default("user"),
});

type AuthUserInput = z.infer<typeof authUserSchema>;

type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: "user" | "admin" | "super_admin";
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
};

interface AuthUserFormProps {
  user?: AuthUser | null;
  onSuccess?: () => void;
}

export const AuthUserForm = ({ user, onSuccess }: AuthUserFormProps) => {
  const createUser = useCreateAuthUser();
  const updateUser = useUpdateAuthUser();
  const isEditMode = !!user;

  const form = useForm<AuthUserInput>({
    resolver: zodResolver(authUserSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      role: user?.role || "user",
    },
  });

  // Reset form when user changes
  React.useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } else {
      form.reset({
        name: "",
        email: "",
        role: "user",
      });
    }
  }, [user?.id, form]); // Use user.id as dependency to ensure it updates when user changes

  const onSubmit = async (data: AuthUserInput) => {
    try {
      console.log("Form submitted with data:", data);
      const currentUser = user; // Capture user at submit time
      const currentIsEditMode = !!currentUser;
      
      if (currentIsEditMode && currentUser) {
        console.log("Updating user:", currentUser.id, "with data:", data);
        const result = await updateUser.mutateAsync({ id: currentUser.id, data });
        console.log("Update result:", result);
        toast.success("User updated successfully", {
          description: `User ${data.name} has been updated.`,
        });
      } else {
        await createUser.mutateAsync(data);
        toast.success("User created successfully", {
          description: `User ${data.name} has been added to the system.`,
        });
      }
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error(isEditMode ? "Failed to update user" : "Failed to create user", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  const isLoading = createUser.isPending || updateUser.isPending;

  return (
    <div className="w-full space-y-6">
      <form id="auth-user-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FieldGroup>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="auth-user-form-name">Name</FieldLabel>
                <Input
                  {...field}
                  id="auth-user-form-name"
                  aria-invalid={fieldState.invalid}
                  placeholder="John Doe"
                  autoComplete="off"
                />
                {fieldState.invalid && fieldState.error && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="auth-user-form-email">Email</FieldLabel>
                <Input
                  {...field}
                  id="auth-user-form-email"
                  type="email"
                  aria-invalid={fieldState.invalid}
                  placeholder="john@example.com"
                  autoComplete="off"
                />
                <FieldDescription>
                  Enter a valid email address for the user.
                </FieldDescription>
                {fieldState.invalid && fieldState.error && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="role"
            control={form.control}
            render={({ field, fieldState }) => {
              console.log("Role field value:", field.value);
              return (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="auth-user-form-role">Role</FieldLabel>
                  <Select
                    value={field.value ?? "user"}
                    onValueChange={(value) => {
                      console.log("Role changed to:", value);
                      field.onChange(value);
                    }}
                  >
                    <SelectTrigger id="auth-user-form-role" aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Select the user&apos;s role. Admins can manage users and settings. Super admins have full access.
                  </FieldDescription>
                  {fieldState.invalid && fieldState.error && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              );
            }}
          />
        </FieldGroup>
      </form>
      <FieldOrientation orientation="horizontal" className="w-full justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => form.reset()}
          disabled={isLoading}
        >
          Reset
        </Button>
        <Button 
          type="submit" 
          form="auth-user-form" 
          disabled={isLoading} 
          variant="default"
          style={{ 
            backgroundColor: 'hsl(var(--primary))', 
            color: 'hsl(var(--primary-foreground))' 
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = 'hsl(var(--primary) / 0.9)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = 'hsl(var(--primary))';
            }
          }}
        >
          {isLoading 
            ? (isEditMode ? "Updating..." : "Creating...") 
            : (isEditMode ? "Update User" : "Create User")}
        </Button>
      </FieldOrientation>
    </div>
  );
};

