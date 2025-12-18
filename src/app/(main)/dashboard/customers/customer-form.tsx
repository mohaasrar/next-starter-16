"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { customerSchema, type CustomerInput } from "@/features/customers/schema";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateCustomer, useUpdateCustomer } from "@/features/customers/hooks";

type Customer = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postalCode: string | null;
  isActive: boolean;
  notes: string | null;
  updatedAt: Date | null;
};

interface CustomerFormProps {
  customer?: Customer | null;
  onSuccess?: () => void;
}

export const CustomerForm = ({ customer, onSuccess }: CustomerFormProps) => {
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const isEditMode = !!customer;

  const form = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer?.name ?? "",
      email: customer?.email ?? "",
      phone: customer?.phone ?? "",
      address: customer?.address ?? "",
      city: customer?.city ?? "",
      country: customer?.country ?? "",
      postalCode: customer?.postalCode ?? "",
      isActive: customer?.isActive ?? true,
      notes: customer?.notes ?? "",
    },
  });

  // Reset form when customer changes
  React.useEffect(() => {
    if (customer) {
      form.reset({
        name: customer.name ?? "",
        email: customer.email ?? "",
        phone: customer.phone ?? "",
        address: customer.address ?? "",
        city: customer.city ?? "",
        country: customer.country ?? "",
        postalCode: customer.postalCode ?? "",
        isActive: customer.isActive ?? true,
        notes: customer.notes ?? "",
      });
    } else {
      form.reset({
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        country: "",
        postalCode: "",
        isActive: true,
        notes: "",
      });
    }
  }, [customer, form]);

  const onSubmit = async (data: CustomerInput) => {
    try {
      console.log("Form submitted with data:", data);
      
      // Transform empty strings to undefined for optional fields
      const submitData = {
        ...data,
        email: data.email === "" ? undefined : data.email,
        phone: data.phone === "" ? undefined : data.phone,
        address: data.address === "" ? undefined : data.address,
        city: data.city === "" ? undefined : data.city,
        country: data.country === "" ? undefined : data.country,
        postalCode: data.postalCode === "" ? undefined : data.postalCode,
        notes: data.notes === "" ? undefined : data.notes,
      };
      
      console.log("Submitting transformed data:", submitData);
      
      if (isEditMode && customer) {
        const result = await updateCustomer.mutateAsync({ id: customer.id, data: submitData });
        console.log("Update result:", result);
        if (!result || !result.id) {
          throw new Error("Customer was not updated. No ID returned.");
        }
        toast.success("Customer updated successfully", {
          description: `Customer has been updated.`,
        });
      } else {
        const result = await createCustomer.mutateAsync(submitData);
        console.log("Create result:", result);
        if (!result || !result.id) {
          throw new Error("Customer was not created. No ID returned.");
        }
        toast.success("Customer created successfully", {
          description: `Customer has been added.`,
        });
      }
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error("Customer form submission error:", error);
      
      let errorMessage = "An error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      if (errorMessage.includes("403") || errorMessage.includes("Forbidden") || errorMessage.includes("permission")) {
        toast.error("Permission Denied", {
          description: `You don't have permission to ${isEditMode ? 'update' : 'create'} customers.`,
        });
      } else {
        toast.error(isEditMode ? "Failed to update customer" : "Failed to create customer", {
          description: errorMessage,
        });
      }
    }
  };

  const isLoading = createCustomer.isPending || updateCustomer.isPending;

  return (
    <div className="w-full space-y-6">
      <form id="customer-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FieldGroup>
          <Controller
            name="name"
            control={form.control}
            render={({ field: formField, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="customer-form-name">Name</FieldLabel>
                <Input
                  {...formField}
                  id="customer-form-name"
                  aria-invalid={fieldState.invalid}
                  placeholder="name"
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
            render={({ field: formField, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="customer-form-email">Email</FieldLabel>
                <Input
                  {...formField}
                  id="customer-form-email"
                  type="email"
                  aria-invalid={fieldState.invalid}
                  placeholder="email"
                  autoComplete="off"
                />
                <FieldDescription>
                  Enter a valid email address.
                </FieldDescription>
                {fieldState.invalid && fieldState.error && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="phone"
            control={form.control}
            render={({ field: formField, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="customer-form-phone">Phone</FieldLabel>
                <Input
                  {...formField}
                  id="customer-form-phone"
                  aria-invalid={fieldState.invalid}
                  placeholder="phone"
                  autoComplete="off"
                />
                {fieldState.invalid && fieldState.error && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="address"
            control={form.control}
            render={({ field: formField, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="customer-form-address">Address</FieldLabel>
                <Input
                  {...formField}
                  id="customer-form-address"
                  aria-invalid={fieldState.invalid}
                  placeholder="address"
                  autoComplete="off"
                />
                {fieldState.invalid && fieldState.error && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="city"
            control={form.control}
            render={({ field: formField, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="customer-form-city">City</FieldLabel>
                <Input
                  {...formField}
                  id="customer-form-city"
                  aria-invalid={fieldState.invalid}
                  placeholder="city"
                  autoComplete="off"
                />
                {fieldState.invalid && fieldState.error && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="country"
            control={form.control}
            render={({ field: formField, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="customer-form-country">Country</FieldLabel>
                <Input
                  {...formField}
                  id="customer-form-country"
                  aria-invalid={fieldState.invalid}
                  placeholder="country"
                  autoComplete="off"
                />
                {fieldState.invalid && fieldState.error && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="postalCode"
            control={form.control}
            render={({ field: formField, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="customer-form-postalCode">Postal Code</FieldLabel>
                <Input
                  {...formField}
                  id="customer-form-postalCode"
                  aria-invalid={fieldState.invalid}
                  placeholder="postal code"
                  autoComplete="off"
                />
                {fieldState.invalid && fieldState.error && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="isActive"
            control={form.control}
            render={({ field: formField, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="customer-form-isActive"
                    checked={formField.value}
                    onCheckedChange={formField.onChange}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldLabel htmlFor="customer-form-isActive">Is Active</FieldLabel>
                </div>
                {fieldState.invalid && fieldState.error && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="notes"
            control={form.control}
            render={({ field: formField, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="customer-form-notes">Notes</FieldLabel>
                <Textarea
                  {...formField}
                  id="customer-form-notes"
                  aria-invalid={fieldState.invalid}
                  placeholder="notes"
                  rows={4}
                />
                {fieldState.invalid && fieldState.error && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
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
          form="customer-form" 
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
            : (isEditMode ? "Update Customer" : "Create Customer")}
        </Button>
      </FieldOrientation>
    </div>
  );
};
