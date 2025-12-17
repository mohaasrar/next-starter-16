"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { userSchema, type UserInput } from "./schema";
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
} from "@/components/ui/input-group";
import { useCreateUser, useUpdateUser } from "./hooks";

type User = {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin" | "super_admin" | null;
  createdAt: Date | null;
};

interface UserFormProps {
  user?: User | null;
  onSuccess?: () => void;
}

export const UserForm = ({ user, onSuccess }: UserFormProps) => {
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const isEditMode = !!user;

  const form = useForm<UserInput>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      role: (user?.role as "user" | "admin" | "super_admin") || "user",
    },
  });

  // Reset form when user changes
  React.useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        email: user.email,
        role: (user.role as "user" | "admin" | "super_admin") || "user",
      });
    } else {
      form.reset({
        name: "",
        email: "",
        role: "user",
      });
    }
  }, [user, form]);

  const onSubmit = async (data: UserInput) => {
    try {
      console.log("User form submitted with data:", data);
      if (isEditMode && user) {
        console.log("Updating user:", user.id, "with data:", data);
        const result = await updateUser.mutateAsync({ id: user.id, data });
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
      console.error("User form submission error:", error);
      
      let errorMessage = "An error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      // Check if it's a 403 Forbidden error
      if (errorMessage.includes("403") || errorMessage.includes("Forbidden") || errorMessage.includes("permission")) {
        toast.error("Permission Denied", {
          description: "You don't have permission to update users. You need to be an admin or super admin. Please contact your administrator.",
        });
      } else {
        toast.error(isEditMode ? "Failed to update user" : "Failed to create user", {
          description: errorMessage,
        });
      }
    }
  };

  const isLoading = createUser.isPending || updateUser.isPending;

  return (
    <div className="w-full space-y-6">
      <form id="user-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FieldGroup>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="user-form-name">Name</FieldLabel>
                <Input
                  {...field}
                  id="user-form-name"
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
                <FieldLabel htmlFor="user-form-email">Email</FieldLabel>
                <Input
                  {...field}
                  id="user-form-email"
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
              console.log("User role field value:", field.value);
              return (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="user-form-role">Role</FieldLabel>
                  <Select
                    value={field.value ?? "user"}
                    onValueChange={(value) => {
                      console.log("User role changed to:", value);
                      field.onChange(value);
                    }}
                  >
                    <SelectTrigger id="user-form-role" aria-invalid={fieldState.invalid}>
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
          form="user-form" 
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
